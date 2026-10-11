from app.core.solver import solve_timetable
from app.schemas.common import AvailabilityStatus, ClassSessionType, SolverStatus
from app.schemas.request import LockedSlot, SolveRequest


def test_feasible_dataset_solves_successfully(feasible_request: SolveRequest):
    """Verifies that a valid department dataset produces a FEASIBLE or OPTIMAL solution."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible, f"Expected feasible solution, got: {response.statusMessage}"
    assert response.status in (SolverStatus.OPTIMAL, SolverStatus.FEASIBLE)
    assert len(response.slots) > 0


def test_room_conflicts_never_occur(feasible_request: SolveRequest):
    """Rule A: A room cannot host overlapping meetings."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    room_time_slots = set()
    for slot in response.slots:
        key = (slot.classroomId, slot.day, slot.periodNumber)
        assert key not in room_time_slots, f"Room conflict detected for {key}"
        room_time_slots.add(key)


def test_teacher_conflicts_never_occur(feasible_request: SolveRequest):
    """Rule B: A teacher cannot teach overlapping meetings."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    teacher_time_slots = set()
    for slot in response.slots:
        key = (slot.teacherId, slot.day, slot.periodNumber)
        assert key not in teacher_time_slots, f"Teacher conflict detected for {key}"
        teacher_time_slots.add(key)


def test_cohort_conflicts_never_occur(feasible_request: SolveRequest):
    """Rule C: A cohort cannot attend overlapping meetings."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    cohort_time_slots = set()
    for slot in response.slots:
        for cohort_id in slot.cohortIds:
            key = (cohort_id, slot.day, slot.periodNumber)
            assert key not in cohort_time_slots, f"Cohort conflict detected for cohort {cohort_id} at {key}"
            cohort_time_slots.add(key)


def test_classroom_capacity_is_strictly_respected(feasible_request: SolveRequest):
    """Rule D: The chosen room must have sufficient capacity for attendance."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    room_map = {r.id: r for r in feasible_request.classrooms}
    cohort_map = {c.id: c for c in feasible_request.cohorts}
    comb_map = {cc.id: cc for cc in feasible_request.combinedClasses}

    for slot in response.slots:
        room = room_map[slot.classroomId]
        if slot.targetType == "cohort":
            expected_attendance = cohort_map[slot.targetId].studentCount
        else:
            expected_attendance = comb_map[slot.targetId].expectedAttendance

        assert room.capacity >= expected_attendance, (
            f"Capacity violation: Room {room.name} (cap: {room.capacity}) "
            f"assigned to attendance {expected_attendance}"
        )


def test_unavailable_teachers_and_rooms_never_scheduled(feasible_request: SolveRequest):
    """Rule E & F: Unavailable teacher and room periods must be hard constraints."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    # Elena Rostova is marked unavailable on Saturday in conftest
    for slot in response.slots:
        if slot.teacherId == "t_erostova":
            assert slot.day != "Saturday", f"Teacher t_erostova scheduled on unavailable day Saturday: {slot}"

        # Shared Room B has unknown availability for most slots except Mon 1,2 and Tue 3,4
        if slot.classroomId == "room_shared_b":
            valid_shared_slots = {
                ("Monday", 1),
                ("Monday", 2),
                ("Tuesday", 3),
                ("Tuesday", 4),
            }
            assert (slot.day, slot.periodNumber) in valid_shared_slots, (
                f"Shared room scheduled during unknown availability slot: {slot.day} period {slot.periodNumber}"
            )


def test_dedicated_lab_requirements_honored(feasible_request: SolveRequest):
    """Rule H: Dedicated lab sessions must use compatible dedicated lab with software tags."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    room_map = {r.id: r for r in feasible_request.classrooms}

    for slot in response.slots:
        if slot.sessionType == ClassSessionType.DEDICATED_LAB:
            room = room_map[slot.classroomId]
            assert room.isDedicatedLab, f"Dedicated lab session scheduled in non-lab room: {room.name}"
            # DS502 requires PyTorch, CUDA GPU -> only VNC-AI Lab has these
            if slot.subjectCode == "DS502":
                assert room.id == "room_ai_lab", f"DS502 scheduled in incompatible lab: {room.name}"


def test_combined_sessions_appear_consistently_for_all_participating_cohorts(feasible_request: SolveRequest):
    """Rule C & Combined Class: Combined class must appear identically for all cohorts."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    ai301_slots = [s for s in response.slots if s.subjectCode == "AI301"]
    assert len(ai301_slots) == 2  # Total 2 periods

    for slot in ai301_slots:
        assert "cohort_bsc_y1" in slot.cohortIds
        assert "cohort_bsc_y2" in slot.cohortIds


def test_required_weekly_teaching_periods_are_exact(feasible_request: SolveRequest):
    """Rule I: Every subject offering must receive its exact required weekly periods."""
    response = solve_timetable(feasible_request)
    assert response.isFeasible

    subject_map = {s.id: s for s in feasible_request.subjectOfferings}
    for sub in feasible_request.subjectOfferings:
        slots_for_sub = [s for s in response.slots if s.subjectOfferingId == sub.id]
        assert len(slots_for_sub) == sub.totalPeriodsPerWeek, (
            f"Subject {sub.code} received {len(slots_for_sub)} periods, "
            f"expected {sub.totalPeriodsPerWeek}"
        )


def test_locked_sessions_remain_fixed(feasible_request: SolveRequest):
    """Rule K: Manually locked timetable entries must remain fixed."""
    # Lock CS101 flexible practical to Wednesday Period 3 in ATH-101 with Alan Smith
    locked = LockedSlot(
        subjectOfferingId="sub_cs101",
        day="Wednesday",
        startPeriod=3,
        blockLength=1,
        classroomId="room_101",
        teacherId="t_asmith",
        sessionType=ClassSessionType.FLEXIBLE_PRACTICAL,
    )
    feasible_request.lockedSlots = [locked]

    response = solve_timetable(feasible_request)
    assert response.isFeasible

    # Find the locked slot in results
    matching_slots = [
        s
        for s in response.slots
        if s.subjectOfferingId == "sub_cs101"
        and s.sessionType == ClassSessionType.FLEXIBLE_PRACTICAL
        and s.day == "Wednesday"
        and s.periodNumber == 3
        and s.classroomId == "room_101"
        and s.teacherId == "t_asmith"
    ]
    assert len(matching_slots) == 1, "Locked slot was not preserved at the exact requested position!"
