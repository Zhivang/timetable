from typing import Dict, List, Set, Tuple
from ..schemas.common import ClassSessionType, TargetType
from ..schemas.request import SolveRequest, SubjectOffering


class ValidationError(Exception):
    def __init__(self, errors: List[str]):
        super().__init__("; ".join(errors))
        self.errors = errors


def validate_solve_request(request: SolveRequest) -> List[str]:
    """
    Performs comprehensive structural, relational, and domain validation.
    Returns a list of human-readable error messages. An empty list means valid.
    """
    errors: List[str] = []

    # 1. Lookup indexes
    building_ids: Set[str] = {b.id for b in request.buildings}
    classroom_map = {c.id: c for c in request.classrooms}
    cohort_map = {co.id: co for co in request.cohorts}
    combined_map = {cc.id: cc for cc in request.combinedClasses}
    teacher_map = {t.id: t for t in request.teachers}
    subject_map = {s.id: s for s in request.subjectOfferings}

    working_days: Set[str] = set(request.academicSettings.workingDays)
    period_numbers: Set[int] = {p.periodNumber for p in request.academicSettings.periods}

    if not working_days:
        errors.append("Academic settings contain no working days.")
    if not period_numbers:
        errors.append("Academic settings contain no lecture periods.")

    # 2. Buildings & Classrooms
    for c in request.classrooms:
        if c.buildingId not in building_ids:
            errors.append(
                f"Classroom '{c.name}' (ID: {c.id}) references unknown buildingId '{c.buildingId}'."
            )
        if c.capacity <= 0:
            errors.append(
                f"Classroom '{c.name}' has non-positive seating capacity ({c.capacity})."
            )

    # 3. Combined Classes
    for cc in request.combinedClasses:
        if len(cc.cohortIds) < 2:
            errors.append(
                f"Combined class '{cc.name}' (ID: {cc.id}) must include at least 2 participating cohorts."
            )
        for ch_id in cc.cohortIds:
            if ch_id not in cohort_map:
                errors.append(
                    f"Combined class '{cc.name}' references non-existent cohort ID '{ch_id}'."
                )
        if cc.expectedAttendance <= 0:
            errors.append(
                f"Combined class '{cc.name}' requires positive expected attendance ({cc.expectedAttendance})."
            )

    # 4. Teachers
    for t in request.teachers:
        if t.minWeeklyPeriods > t.maxWeeklyPeriods:
            errors.append(
                f"Teacher '{t.name}' has minWeeklyPeriods ({t.minWeeklyPeriods}) > maxWeeklyPeriods ({t.maxWeeklyPeriods})."
            )

    # 5. Subject Offerings
    max_classroom_capacity = (
        max((c.capacity for c in request.classrooms), default=0)
    )

    for s in request.subjectOfferings:
        # Target group reference
        attendance = 0
        if s.targetType == TargetType.COHORT:
            if s.targetId not in cohort_map:
                errors.append(
                    f"Subject '{s.code}' references non-existent cohort '{s.targetId}'."
                )
            else:
                attendance = cohort_map[s.targetId].studentCount
        elif s.targetType == TargetType.COMBINED:
            if s.targetId not in combined_map:
                errors.append(
                    f"Subject '{s.code}' references non-existent combined class '{s.targetId}'."
                )
            else:
                attendance = combined_map[s.targetId].expectedAttendance

        # Attendance vs Maximum room capacity
        if attendance > max_classroom_capacity and request.classrooms:
            errors.append(
                f"Subject '{s.code}' attendance ({attendance}) exceeds maximum department room capacity ({max_classroom_capacity})."
            )

        # Teachers eligibility
        if not s.eligibleTeacherIds:
            errors.append(
                f"Subject '{s.code}' has no eligible teachers assigned."
            )
        for tid in s.eligibleTeacherIds:
            if tid not in teacher_map:
                errors.append(
                    f"Subject '{s.code}' lists non-existent eligible teacher ID '{tid}'."
                )

        if s.assignedTeacherId:
            if s.assignedTeacherId not in teacher_map:
                errors.append(
                    f"Subject '{s.code}' has non-existent assignedTeacherId '{s.assignedTeacherId}'."
                )
            elif s.assignedTeacherId not in s.eligibleTeacherIds:
                errors.append(
                    f"Subject '{s.code}' assigned teacher '{s.assignedTeacherId}' is not listed in eligibleTeacherIds."
                )

        # Dedicated lab check
        if s.dedicatedLabPeriods > 0:
            lab_rooms = [
                c
                for c in request.classrooms
                if c.isDedicatedLab
                and c.capacity >= attendance
                and all(sw in c.installedSoftware for sw in s.requiredSoftware)
            ]
            if not lab_rooms:
                errors.append(
                    f"Subject '{s.code}' requires {s.dedicatedLabPeriods} dedicated lab periods with software {s.requiredSoftware}, but no lab meets both capacity ({attendance}) and software requirements."
                )

        # Permissible block lengths check
        for blen in s.permissibleBlockLengths:
            if blen <= 0 or blen > s.totalPeriodsPerWeek:
                errors.append(
                    f"Subject '{s.code}' has invalid permissible block length {blen} (must be between 1 and {s.totalPeriodsPerWeek})."
                )

    # 6. Locked Slots validation
    for ls in request.lockedSlots:
        if ls.subjectOfferingId not in subject_map:
            errors.append(
                f"Locked slot references non-existent subject '{ls.subjectOfferingId}'."
            )
        if ls.classroomId not in classroom_map:
            errors.append(
                f"Locked slot references non-existent classroom '{ls.classroomId}'."
            )
        if ls.teacherId not in teacher_map:
            errors.append(
                f"Locked slot references non-existent teacher '{ls.teacherId}'."
            )
        if ls.day not in working_days:
            errors.append(
                f"Locked slot scheduled on inactive working day '{ls.day}'."
            )
        if ls.startPeriod not in period_numbers:
            errors.append(
                f"Locked slot start period {ls.startPeriod} is not in configured periods."
            )

    return errors
