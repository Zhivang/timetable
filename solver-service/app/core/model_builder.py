from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set, Tuple
from ortools.sat.python import cp_model
from ..schemas.common import ClassSessionType, TargetType
from ..schemas.request import (
    AcademicPeriod,
    AcademicSettings,
    Classroom,
    Cohort,
    CombinedClass,
    LockedSlot,
    OptimizationWeights,
    SolveRequest,
    SubjectOffering,
    Teacher,
)
from .time_utils import (
    get_transition_gap_minutes,
    is_block_consecutive_and_valid,
)


@dataclass(frozen=True)
class MeetingRequirement:
    """
    An atomic scheduled session requirement decomposed from a SubjectOffering.
    """
    meeting_id: str
    subject_id: str
    subject_code: str
    subject_name: str
    session_type: ClassSessionType
    block_length: int
    target_type: TargetType
    target_id: str
    target_name: str
    target_cohort_ids: Tuple[str, ...]
    expected_attendance: int
    eligible_teacher_ids: Tuple[str, ...]
    assigned_teacher_id: Optional[str]
    required_software: Tuple[str, ...]
    required_facilities: Tuple[str, ...]


@dataclass(frozen=True)
class CandidateAssignment:
    """
    A mathematically valid placement option for a MeetingRequirement.
    """
    candidate_id: str
    meeting_id: str
    day: str
    start_period: int
    occupied_periods: Tuple[int, ...]
    classroom_id: str
    classroom_name: str
    building_id: str
    building_code: str
    building_name: str
    teacher_id: str
    teacher_name: str


def decompose_subject_into_meetings(
    subject: SubjectOffering,
    cohort_map: Dict[str, Cohort],
    combined_map: Dict[str, CombinedClass],
) -> List[MeetingRequirement]:
    """
    Decomposes subject offering's required periods into meetings matching
    permissible block lengths (1 or 2 periods) and session types.
    """
    # 1. Determine target cohorts and attendance
    target_cohort_ids: List[str] = []
    expected_attendance: int = 0
    target_name: str = subject.targetName

    if subject.targetType == TargetType.COHORT:
        target_cohort_ids = [subject.targetId]
        cohort = cohort_map.get(subject.targetId)
        expected_attendance = cohort.studentCount if cohort else 0
        if not target_name and cohort:
            target_name = cohort.name
    else:
        combined = combined_map.get(subject.targetId)
        target_cohort_ids = combined.cohortIds if combined else []
        expected_attendance = combined.expectedAttendance if combined else 0
        if not target_name and combined:
            target_name = combined.name

    meetings: List[MeetingRequirement] = []
    counter = 1

    def partition_periods(periods_needed: int, allowed_blocks: List[int]) -> List[int]:
        if periods_needed <= 0:
            return []
        # Sort blocks descending (e.g. 2, then 1)
        sorted_blocks = sorted([b for b in allowed_blocks if b > 0], reverse=True)
        if not sorted_blocks:
            sorted_blocks = [1]

        blocks: List[int] = []
        rem = periods_needed
        while rem > 0:
            placed = False
            for b in sorted_blocks:
                if b <= rem:
                    blocks.append(b)
                    rem -= b
                    placed = True
                    break
            if not placed:
                # Fallback to 1
                blocks.append(1)
                rem -= 1
        return blocks

    allowed_blocks = subject.permissibleBlockLengths or [1, 2]

    # Decompose Dedicated Lab requirements first
    for block_len in partition_periods(subject.dedicatedLabPeriods, allowed_blocks):
        meetings.append(
            MeetingRequirement(
                meeting_id=f"{subject.id}_lab_{counter}",
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                session_type=ClassSessionType.DEDICATED_LAB,
                block_length=block_len,
                target_type=subject.targetType,
                target_id=subject.targetId,
                target_name=target_name,
                target_cohort_ids=tuple(target_cohort_ids),
                expected_attendance=expected_attendance,
                eligible_teacher_ids=tuple(subject.eligibleTeacherIds),
                assigned_teacher_id=subject.assignedTeacherId,
                required_software=tuple(subject.requiredSoftware),
                required_facilities=tuple(subject.requiredFacilities),
            )
        )
        counter += 1

    # Decompose Flexible Practical requirements
    for block_len in partition_periods(subject.flexiblePracticalPeriods, allowed_blocks):
        meetings.append(
            MeetingRequirement(
                meeting_id=f"{subject.id}_flex_{counter}",
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                session_type=ClassSessionType.FLEXIBLE_PRACTICAL,
                block_length=block_len,
                target_type=subject.targetType,
                target_id=subject.targetId,
                target_name=target_name,
                target_cohort_ids=tuple(target_cohort_ids),
                expected_attendance=expected_attendance,
                eligible_teacher_ids=tuple(subject.eligibleTeacherIds),
                assigned_teacher_id=subject.assignedTeacherId,
                required_software=tuple(subject.requiredSoftware),
                required_facilities=tuple(subject.requiredFacilities),
            )
        )
        counter += 1

    # Decompose Theory requirements
    for block_len in partition_periods(subject.theoryPeriods, allowed_blocks):
        meetings.append(
            MeetingRequirement(
                meeting_id=f"{subject.id}_th_{counter}",
                subject_id=subject.id,
                subject_code=subject.code,
                subject_name=subject.name,
                session_type=ClassSessionType.THEORY,
                block_length=block_len,
                target_type=subject.targetType,
                target_id=subject.targetId,
                target_name=target_name,
                target_cohort_ids=tuple(target_cohort_ids),
                expected_attendance=expected_attendance,
                eligible_teacher_ids=tuple(subject.eligibleTeacherIds),
                assigned_teacher_id=subject.assignedTeacherId,
                required_software=(),
                required_facilities=tuple(subject.requiredFacilities),
            )
        )
        counter += 1

    return meetings


def generate_candidate_assignments(
    meeting: MeetingRequirement,
    request: SolveRequest,
    periods_map: Dict[int, AcademicPeriod],
    building_map: Dict[str, Any],
    locked_slots: List[LockedSlot],
) -> List[CandidateAssignment]:
    """
    Generates all statically feasible (day, start_period, room, teacher) combinations.
    Enforces rules D, E, F, G, H, K and lunch boundaries.
    """
    candidates: List[CandidateAssignment] = []

    # Check if this meeting is explicitly locked
    locked_match: Optional[LockedSlot] = None
    for ls in locked_slots:
        if (
            ls.subjectOfferingId == meeting.subject_id
            and ls.sessionType == meeting.session_type
            and ls.blockLength == meeting.block_length
        ):
            locked_match = ls
            break

    working_days = request.academicSettings.workingDays
    lunch_break = request.academicSettings.lunchBreak

    eligible_teachers = [
        t for t in request.teachers
        if t.id in meeting.eligible_teacher_ids
        and (meeting.assigned_teacher_id is None or t.id == meeting.assigned_teacher_id)
    ]

    for day in working_days:
        for p_start in periods_map.keys():
            # Check consecutive periods and lunch break crossing
            if not is_block_consecutive_and_valid(
                p_start, meeting.block_length, periods_map, lunch_break
            ):
                continue

            occupied_periods = tuple(range(p_start, p_start + meeting.block_length))

            for room in request.classrooms:
                # Rule D: Seating capacity >= expected attendance
                if room.capacity < meeting.expected_attendance:
                    continue

                # Rule G & H: Room capabilities and session type suitability
                if meeting.session_type == ClassSessionType.DEDICATED_LAB:
                    if not room.isDedicatedLab:
                        continue
                    # Check required software tags
                    if not all(sw in room.installedSoftware for sw in meeting.required_software):
                        continue
                elif meeting.session_type == ClassSessionType.THEORY:
                    if not room.canHostTheory:
                        continue
                elif meeting.session_type == ClassSessionType.FLEXIBLE_PRACTICAL:
                    # Laptop practical can use laptop-capable classroom or practical lab
                    if not (room.canHostLaptopPractical or room.isDedicatedLab):
                        continue

                # Rule F: Room explicit availability
                room_avail_ok = True
                for p_num in occupied_periods:
                    k = f"{day}_{p_num}"
                    status = room.availability.get(k)
                    # If shared room or unknown, never assume available!
                    if status != "available":
                        room_avail_ok = False
                        break
                if not room_avail_ok:
                    continue

                for teacher in eligible_teachers:
                    # Rule E: Teacher availability
                    teacher_avail_ok = True
                    for p_num in occupied_periods:
                        k = f"{day}_{p_num}"
                        status = teacher.availability.get(k)
                        if status == "unavailable":
                            teacher_avail_ok = False
                            break
                    if not teacher_avail_ok:
                        continue

                    # Rule K: If locked, must match locked slot exactly
                    if locked_match:
                        if (
                            day != locked_match.day
                            or p_start != locked_match.startPeriod
                            or room.id != locked_match.classroomId
                            or teacher.id != locked_match.teacherId
                        ):
                            continue

                    building = building_map.get(room.buildingId)
                    b_code = building.code if building else ""
                    b_name = building.name if building else room.buildingName

                    cand_id = f"{meeting.meeting_id}_{day}_{p_start}_{room.id}_{teacher.id}"
                    candidates.append(
                        CandidateAssignment(
                            candidate_id=cand_id,
                            meeting_id=meeting.meeting_id,
                            day=day,
                            start_period=p_start,
                            occupied_periods=occupied_periods,
                            classroom_id=room.id,
                            classroom_name=room.name,
                            building_id=room.buildingId,
                            building_code=b_code,
                            building_name=b_name,
                            teacher_id=teacher.id,
                            teacher_name=teacher.name,
                        )
                    )

    return candidates


class TimetableModelBuilder:
    def __init__(self, request: SolveRequest):
        self.request = request
        self.model = cp_model.CpModel()

        self.periods_map = {
            p.periodNumber: p for p in request.academicSettings.periods
        }
        self.building_map = {b.id: b for b in request.buildings}
        self.cohort_map = {co.id: co for co in request.cohorts}
        self.combined_map = {cc.id: cc for cc in request.combinedClasses}
        self.teacher_map = {t.id: t for t in request.teachers}
        self.classroom_map = {c.id: c for c in request.classrooms}

        self.meetings: List[MeetingRequirement] = []
        self.candidates: Dict[str, List[CandidateAssignment]] = {}
        # Decision vars: (meeting_id, cand_id) -> BoolVar
        self.x: Dict[Tuple[str, str], cp_model.IntVar] = {}

        self.objective_terms: List[cp_model.LinearExpr] = []

    def build(self) -> cp_model.CpModel:
        # 1. Decompose all subject offerings
        for subject in self.request.subjectOfferings:
            sub_meetings = decompose_subject_into_meetings(
                subject, self.cohort_map, self.combined_map
            )
            self.meetings.extend(sub_meetings)

        # 2. Generate candidate assignments and decision variables
        for meeting in self.meetings:
            cands = generate_candidate_assignments(
                meeting,
                self.request,
                self.periods_map,
                self.building_map,
                self.request.lockedSlots,
            )
            self.candidates[meeting.meeting_id] = cands

            for cand in cands:
                var = self.model.NewBoolVar(f"x_{cand.candidate_id}")
                self.x[(meeting.meeting_id, cand.candidate_id)] = var

        # Rule I: Every meeting must be assigned exactly once
        for meeting in self.meetings:
            cands = self.candidates[meeting.meeting_id]
            vars_list = [self.x[(meeting.meeting_id, c.candidate_id)] for c in cands]
            self.model.AddExactlyOne(vars_list)

        # Pre-index candidates by (day, period)
        # room_occupancy: (room_id, day, period) -> [(meeting, cand)]
        room_occ: Dict[Tuple[str, str, int], List[Tuple[MeetingRequirement, CandidateAssignment]]] = {}
        # teacher_occupancy: (teacher_id, day, period) -> [(meeting, cand)]
        teacher_occ: Dict[Tuple[str, str, int], List[Tuple[MeetingRequirement, CandidateAssignment]]] = {}
        # cohort_occupancy: (cohort_id, day, period) -> [(meeting, cand)]
        cohort_occ: Dict[Tuple[str, str, int], List[Tuple[MeetingRequirement, CandidateAssignment]]] = {}

        for meeting in self.meetings:
            for cand in self.candidates[meeting.meeting_id]:
                for p_num in cand.occupied_periods:
                    r_key = (cand.classroom_id, cand.day, p_num)
                    room_occ.setdefault(r_key, []).append((meeting, cand))

                    t_key = (cand.teacher_id, cand.day, p_num)
                    teacher_occ.setdefault(t_key, []).append((meeting, cand))

                    for ch_id in meeting.target_cohort_ids:
                        c_key = (ch_id, cand.day, p_num)
                        cohort_occ.setdefault(c_key, []).append((meeting, cand))

        # Rule A: Room cannot host overlapping meetings
        for r_key, pairs in room_occ.items():
            if len(pairs) > 1:
                self.model.Add(
                    sum(self.x[(m.meeting_id, c.candidate_id)] for m, c in pairs) <= 1
                )

        # Rule B: Teacher cannot teach overlapping meetings
        for t_key, pairs in teacher_occ.items():
            if len(pairs) > 1:
                self.model.Add(
                    sum(self.x[(m.meeting_id, c.candidate_id)] for m, c in pairs) <= 1
                )

        # Rule C: Cohort cannot attend overlapping meetings
        for c_key, pairs in cohort_occ.items():
            if len(pairs) > 1:
                self.model.Add(
                    sum(self.x[(m.meeting_id, c.candidate_id)] for m, c in pairs) <= 1
                )

        # Rule J: Teacher maximum teaching load not exceeded
        for teacher in self.request.teachers:
            t_terms = []
            for meeting in self.meetings:
                for cand in self.candidates[meeting.meeting_id]:
                    if cand.teacher_id == teacher.id:
                        var = self.x[(meeting.meeting_id, cand.candidate_id)]
                        t_terms.append(meeting.block_length * var)
            if t_terms:
                self.model.Add(sum(t_terms) <= teacher.maxWeeklyPeriods)

        # Rule L: Building transitions & travel-time restrictions
        self._add_travel_time_constraints()

        # Section 5: Soft constraints & objective penalties
        self._add_soft_constraints()

        if self.objective_terms:
            self.model.Minimize(sum(self.objective_terms))

        return self.model

    def _add_travel_time_constraints(self):
        """
        Rule L: A building change between adjacent or nearby meetings on the same day
        is allowed only if sufficient transition time is available.
        """
        diff_buffer = self.request.academicSettings.transitionBufferDifferentBuilding

        # 1. Travel time for Cohorts
        # Group candidates by (cohort_id, day)
        for cohort in self.request.cohorts:
            for day in self.request.academicSettings.workingDays:
                cohort_cands: List[Tuple[MeetingRequirement, CandidateAssignment]] = []
                for meeting in self.meetings:
                    if cohort.id in meeting.target_cohort_ids:
                        for cand in self.candidates[meeting.meeting_id]:
                            if cand.day == day:
                                cohort_cands.append((meeting, cand))

                # Check pairs (m1, c1) and (m2, c2)
                for i in range(len(cohort_cands)):
                    m1, c1 = cohort_cands[i]
                    end_p1 = max(c1.occupied_periods)
                    p1_obj = self.periods_map.get(end_p1)
                    if not p1_obj:
                        continue

                    for j in range(i + 1, len(cohort_cands)):
                        m2, c2 = cohort_cands[j]
                        if m1.meeting_id == m2.meeting_id:
                            continue

                        start_p2 = min(c2.occupied_periods)
                        p2_obj = self.periods_map.get(start_p2)
                        if not p2_obj:
                            continue

                        # If m1 is earlier than m2
                        if end_p1 < start_p2 and c1.building_id != c2.building_id:
                            gap = get_transition_gap_minutes(p1_obj, p2_obj)
                            if gap < diff_buffer:
                                v1 = self.x[(m1.meeting_id, c1.candidate_id)]
                                v2 = self.x[(m2.meeting_id, c2.candidate_id)]
                                self.model.Add(v1 + v2 <= 1)

                        # If m2 is earlier than m1
                        end_p2 = max(c2.occupied_periods)
                        start_p1 = min(c1.occupied_periods)
                        p2_end_obj = self.periods_map.get(end_p2)
                        p1_start_obj = self.periods_map.get(start_p1)
                        if p2_end_obj and p1_start_obj and end_p2 < start_p1 and c1.building_id != c2.building_id:
                            gap = get_transition_gap_minutes(p2_end_obj, p1_start_obj)
                            if gap < diff_buffer:
                                v1 = self.x[(m1.meeting_id, c1.candidate_id)]
                                v2 = self.x[(m2.meeting_id, c2.candidate_id)]
                                self.model.Add(v1 + v2 <= 1)

        # 2. Travel time for Teachers
        for teacher in self.request.teachers:
            for day in self.request.academicSettings.workingDays:
                teacher_cands: List[Tuple[MeetingRequirement, CandidateAssignment]] = []
                for meeting in self.meetings:
                    for cand in self.candidates[meeting.meeting_id]:
                        if cand.teacher_id == teacher.id and cand.day == day:
                            teacher_cands.append((meeting, cand))

                for i in range(len(teacher_cands)):
                    m1, c1 = teacher_cands[i]
                    end_p1 = max(c1.occupied_periods)
                    p1_obj = self.periods_map.get(end_p1)
                    if not p1_obj:
                        continue

                    for j in range(i + 1, len(teacher_cands)):
                        m2, c2 = teacher_cands[j]
                        if m1.meeting_id == m2.meeting_id:
                            continue

                        start_p2 = min(c2.occupied_periods)
                        p2_obj = self.periods_map.get(start_p2)
                        if not p2_obj:
                            continue

                        if end_p1 < start_p2 and c1.building_id != c2.building_id:
                            gap = get_transition_gap_minutes(p1_obj, p2_obj)
                            if gap < diff_buffer:
                                v1 = self.x[(m1.meeting_id, c1.candidate_id)]
                                v2 = self.x[(m2.meeting_id, c2.candidate_id)]
                                self.model.Add(v1 + v2 <= 1)

    def _add_soft_constraints(self):
        """
        Translates configurable optimization preferences into integer-weighted penalty terms.
        """
        weights: OptimizationWeights = self.request.schedulingPreferences

        # 1. Minimize Building Changes (Cohort & Teacher)
        if weights.minimizeBuildingChanges and weights.buildingChangeWeight > 0:
            scale = weights.buildingChangeWeight * 10
            # For each cohort, penalize adjacent periods in different buildings
            for cohort in self.request.cohorts:
                for day in self.request.academicSettings.workingDays:
                    for p_num in self.periods_map.keys():
                        next_p = p_num + 1
                        if next_p in self.periods_map:
                            # Find all cands covering p_num and next_p
                            for m1 in self.meetings:
                                if cohort.id in m1.target_cohort_ids:
                                    for c1 in self.candidates[m1.meeting_id]:
                                        if c1.day == day and max(c1.occupied_periods) == p_num:
                                            for m2 in self.meetings:
                                                if m2.meeting_id != m1.meeting_id and cohort.id in m2.target_cohort_ids:
                                                    for c2 in self.candidates[m2.meeting_id]:
                                                        if (
                                                            c2.day == day
                                                            and min(c2.occupied_periods) == next_p
                                                            and c1.building_id != c2.building_id
                                                        ):
                                                            pen = self.model.NewBoolVar(
                                                                f"pen_bld_{c1.candidate_id}_{c2.candidate_id}"
                                                            )
                                                            v1 = self.x[(m1.meeting_id, c1.candidate_id)]
                                                            v2 = self.x[(m2.meeting_id, c2.candidate_id)]
                                                            self.model.AddBoolAnd([v1, v2]).OnlyEnforceIf(pen)
                                                            self.objective_terms.append(scale * pen)

        # 2. Minimize Room Changes for same cohort in adjacent periods
        if weights.minimizeRoomChanges and weights.roomChangeWeight > 0:
            scale = weights.roomChangeWeight * 5
            for cohort in self.request.cohorts:
                for day in self.request.academicSettings.workingDays:
                    for p_num in self.periods_map.keys():
                        next_p = p_num + 1
                        if next_p in self.periods_map:
                            for m1 in self.meetings:
                                if cohort.id in m1.target_cohort_ids:
                                    for c1 in self.candidates[m1.meeting_id]:
                                        if c1.day == day and max(c1.occupied_periods) == p_num:
                                            for m2 in self.meetings:
                                                if m2.meeting_id != m1.meeting_id and cohort.id in m2.target_cohort_ids:
                                                    for c2 in self.candidates[m2.meeting_id]:
                                                        if (
                                                            c2.day == day
                                                            and min(c2.occupied_periods) == next_p
                                                            and c1.classroom_id != c2.classroom_id
                                                        ):
                                                            pen = self.model.NewBoolVar(
                                                                f"pen_room_{c1.candidate_id}_{c2.candidate_id}"
                                                            )
                                                            v1 = self.x[(m1.meeting_id, c1.candidate_id)]
                                                            v2 = self.x[(m2.meeting_id, c2.candidate_id)]
                                                            self.model.AddBoolAnd([v1, v2]).OnlyEnforceIf(pen)
                                                            self.objective_terms.append(scale * pen)

        # 3. Minimize Teacher Isolated Gaps (Compact Teaching Blocks)
        if weights.minimizeTeacherGaps and weights.teacherGapWeight > 0:
            scale = weights.teacherGapWeight * 10
            for teacher in self.request.teachers:
                for day in self.request.academicSettings.workingDays:
                    for p_num in sorted(self.periods_map.keys()):
                        gap_p = p_num + 1
                        p_after = p_num + 2
                        if gap_p in self.periods_map and p_after in self.periods_map:
                            # Teacher has class at p_num, NO class at gap_p, and class at p_after
                            has_p1 = [
                                self.x[(m.meeting_id, c.candidate_id)]
                                for m in self.meetings
                                for c in self.candidates[m.meeting_id]
                                if c.teacher_id == teacher.id and c.day == day and p_num in c.occupied_periods
                            ]
                            has_gap = [
                                self.x[(m.meeting_id, c.candidate_id)]
                                for m in self.meetings
                                for c in self.candidates[m.meeting_id]
                                if c.teacher_id == teacher.id and c.day == day and gap_p in c.occupied_periods
                            ]
                            has_p2 = [
                                self.x[(m.meeting_id, c.candidate_id)]
                                for m in self.meetings
                                for c in self.candidates[m.meeting_id]
                                if c.teacher_id == teacher.id and c.day == day and p_after in c.occupied_periods
                            ]

                            if has_p1 and has_p2:
                                t_gap_pen = self.model.NewBoolVar(f"t_gap_{teacher.id}_{day}_{gap_p}")
                                # Enforce gap penalty if sum(has_p1) >= 1 and sum(has_p2) >= 1 and sum(has_gap) == 0
                                b1 = self.model.NewBoolVar(f"bg1_{teacher.id}_{day}_{p_num}")
                                b2 = self.model.NewBoolVar(f"bg2_{teacher.id}_{day}_{p_after}")
                                self.model.Add(sum(has_p1) >= 1).OnlyEnforceIf(b1)
                                self.model.Add(sum(has_p1) == 0).OnlyEnforceIf(b1.Not())
                                self.model.Add(sum(has_p2) >= 1).OnlyEnforceIf(b2)
                                self.model.Add(sum(has_p2) == 0).OnlyEnforceIf(b2.Not())

                                if has_gap:
                                    b_nogap = self.model.NewBoolVar(f"bnogap_{teacher.id}_{day}_{gap_p}")
                                    self.model.Add(sum(has_gap) == 0).OnlyEnforceIf(b_nogap)
                                    self.model.Add(sum(has_gap) >= 1).OnlyEnforceIf(b_nogap.Not())
                                    self.model.AddBoolAnd([b1, b2, b_nogap]).OnlyEnforceIf(t_gap_pen)
                                else:
                                    self.model.AddBoolAnd([b1, b2]).OnlyEnforceIf(t_gap_pen)

                                self.objective_terms.append(scale * t_gap_pen)

        # 4. Avoid Excessively Long Student Days
        if weights.avoidExcessivelyLongStudentDays and weights.longDayPenaltyWeight > 0:
            scale = weights.longDayPenaltyWeight * 15
            max_day_periods = weights.maxStudentPeriodsPerDay
            for cohort in self.request.cohorts:
                for day in self.request.academicSettings.workingDays:
                    day_terms = []
                    for meeting in self.meetings:
                        if cohort.id in meeting.target_cohort_ids:
                            for c in self.candidates[meeting.meeting_id]:
                                if c.day == day:
                                    day_terms.append(
                                        meeting.block_length * self.x[(meeting.meeting_id, c.candidate_id)]
                                    )
                    if day_terms:
                        surplus = self.model.NewIntVar(
                            0, len(self.periods_map), f"surplus_{cohort.id}_{day}"
                        )
                        self.model.Add(surplus >= sum(day_terms) - max_day_periods)
                        self.objective_terms.append(scale * surplus)
