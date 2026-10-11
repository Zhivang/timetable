import copy
from typing import TYPE_CHECKING, Any, Dict, List
from ..schemas.common import AvailabilityStatus, SolverStatus
from ..schemas.request import Classroom, SolveRequest, SubjectOffering, Teacher
from ..schemas.response import DiagnosticSuggestion

if TYPE_CHECKING:
    from .solver import solve_timetable


def evaluate_infeasibility_diagnostics(
    base_request: SolveRequest,
    max_scenarios: int = 5,
) -> List[DiagnosticSuggestion]:
    """
    Evaluates plausible relaxation scenarios in separate what-if CP-SAT solver runs.
    A suggestion is ONLY reported if the corresponding modified model was actually evaluated.
    """
    from .solver import solve_timetable

    suggestions: List[DiagnosticSuggestion] = []
    scenarios_run = 0

    # 1. What-If Scenario: Shared Rooms Availability Expansion
    # If shared rooms exist with "unknown" periods, test making them available
    shared_rooms = [r for r in base_request.classrooms if r.isShared]
    if shared_rooms and scenarios_run < max_scenarios:
        for room in shared_rooms:
            if scenarios_run >= max_scenarios:
                break
            unknown_keys = [
                k for k, v in room.availability.items() if v == AvailabilityStatus.UNKNOWN
            ]
            if unknown_keys:
                req_copy = copy.deepcopy(base_request)
                req_copy.options.maxTimeInSeconds = min(
                    base_request.options.maxTimeInSeconds, 5.0
                )
                target_room = next(
                    r for r in req_copy.classrooms if r.id == room.id
                )
                for k in unknown_keys[:6]:
                    target_room.availability[k] = AvailabilityStatus.AVAILABLE

                test_res = solve_timetable(req_copy, skip_diagnostics=True)
                scenarios_run += 1
                suggestions.append(
                    DiagnosticSuggestion(
                        category="room_availability",
                        scenarioDescription=f"Mark shared room '{room.name}' as available during unknown periods",
                        tested=True,
                        resultStatus=test_res.status,
                        allowsFeasibleSolution=test_res.isFeasible,
                        explanation=(
                            f"Tested converting up to {len(unknown_keys[:6])} unknown periods in shared room '{room.name}' to available. "
                            + (
                                "This change allows a feasible timetable to be solved!"
                                if test_res.isFeasible
                                else "Still mathematically infeasible with this single change."
                            )
                        ),
                        proposedChange={
                            "classroomId": room.id,
                            "classroomName": room.name,
                            "action": "expand_room_availability",
                            "slotsMadeAvailable": unknown_keys[:6],
                        },
                    )
                )

    # 2. What-If Scenario: Teacher Workload Upper Bound Increment (+2 periods)
    # Test if expanding any constrained teacher's maxTeachingLoad unlocks feasibility
    if scenarios_run < max_scenarios:
        for teacher in base_request.teachers:
            if scenarios_run >= max_scenarios:
                break
            req_copy = copy.deepcopy(base_request)
            req_copy.options.maxTimeInSeconds = min(
                base_request.options.maxTimeInSeconds, 5.0
            )
            target_teacher = next(t for t in req_copy.teachers if t.id == teacher.id)
            target_teacher.maxWeeklyPeriods += 2

            test_res = solve_timetable(req_copy, skip_diagnostics=True)
            scenarios_run += 1
            suggestions.append(
                DiagnosticSuggestion(
                    category="teacher_load",
                    scenarioDescription=f"Allow instructor '{teacher.name}' an additional 2 weekly periods (cap: {teacher.maxWeeklyPeriods} -> {teacher.maxWeeklyPeriods + 2})",
                    tested=True,
                    resultStatus=test_res.status,
                    allowsFeasibleSolution=test_res.isFeasible,
                    explanation=(
                        f"Evaluated expanding max weekly teaching periods for '{teacher.name}' from {teacher.maxWeeklyPeriods} to {teacher.maxWeeklyPeriods + 2}. "
                        + (
                            "This change successfully resolves the infeasibility and yields a valid timetable!"
                            if test_res.isFeasible
                            else "Still mathematically infeasible; bottleneck is not solely this teacher's workload limit."
                        )
                    ),
                    proposedChange={
                        "teacherId": teacher.id,
                        "teacherName": teacher.name,
                        "action": "increase_max_periods",
                        "newMaxWeeklyPeriods": teacher.maxWeeklyPeriods + 2,
                    },
                )
            )

    # 3. What-If Scenario: Teacher Blocked Periods Relaxation
    # If a teacher has blocked periods, test opening their blocked periods
    if scenarios_run < max_scenarios:
        for teacher in base_request.teachers:
            if scenarios_run >= max_scenarios:
                break
            blocked_keys = [
                k for k, v in teacher.availability.items() if v == AvailabilityStatus.UNAVAILABLE
            ]
            if blocked_keys:
                req_copy = copy.deepcopy(base_request)
                req_copy.options.maxTimeInSeconds = min(
                    base_request.options.maxTimeInSeconds, 5.0
                )
                target_teacher = next(t for t in req_copy.teachers if t.id == teacher.id)
                for k in blocked_keys:
                    target_teacher.availability[k] = AvailabilityStatus.AVAILABLE

                test_res = solve_timetable(req_copy, skip_diagnostics=True)
                scenarios_run += 1
                suggestions.append(
                    DiagnosticSuggestion(
                        category="teacher_availability",
                        scenarioDescription=f"Open blocked unavailable periods for '{teacher.name}'",
                        tested=True,
                        resultStatus=test_res.status,
                        allowsFeasibleSolution=test_res.isFeasible,
                        explanation=(
                            f"Tested releasing {len(blocked_keys)} unavailable periods for instructor '{teacher.name}'. "
                            + (
                                "This change allows a feasible timetable to be solved!"
                                if test_res.isFeasible
                                else "Still mathematically infeasible with this single modification."
                            )
                        ),
                        proposedChange={
                            "teacherId": teacher.id,
                            "teacherName": teacher.name,
                            "action": "unblock_teacher_availability",
                            "unblockedPeriods": blocked_keys,
                        },
                    )
                )

    # 4. What-If Scenario: Subject Teaching Periods Proposal (User Approval Required)
    # Test reducing heavy subject by 1 theory period as a proposal
    if scenarios_run < max_scenarios and base_request.subjectOfferings:
        heaviest_subject = max(
            base_request.subjectOfferings, key=lambda s: s.totalPeriodsPerWeek
        )
        if heaviest_subject.theoryPeriods > 1:
            req_copy = copy.deepcopy(base_request)
            req_copy.options.maxTimeInSeconds = min(
                base_request.options.maxTimeInSeconds, 5.0
            )
            target_sub = next(
                s for s in req_copy.subjectOfferings if s.id == heaviest_subject.id
            )
            target_sub.theoryPeriods -= 1
            target_sub.totalPeriodsPerWeek -= 1

            test_res = solve_timetable(req_copy, skip_diagnostics=True)
            scenarios_run += 1
            suggestions.append(
                DiagnosticSuggestion(
                    category="subject_requirement_proposal",
                    scenarioDescription=f"Proposed User-Approved Reduction: Reduce subject '{heaviest_subject.code}' theory requirement from {heaviest_subject.theoryPeriods} to {heaviest_subject.theoryPeriods - 1} periods",
                    tested=True,
                    resultStatus=test_res.status,
                    allowsFeasibleSolution=test_res.isFeasible,
                    explanation=(
                        f"Tested reducing required weekly theory periods for '{heaviest_subject.code}' by 1 period. "
                        + (
                            "This proposed adjustment allows an otherwise infeasible timetable to be solved! (Requires explicit user/department approval)."
                            if test_res.isFeasible
                            else "Still mathematically infeasible with this single reduction."
                        )
                    ),
                    proposedChange={
                        "subjectOfferingId": heaviest_subject.id,
                        "subjectCode": heaviest_subject.code,
                        "action": "propose_theory_period_reduction",
                        "newTheoryPeriods": heaviest_subject.theoryPeriods - 1,
                        "newTotalPeriods": heaviest_subject.totalPeriodsPerWeek - 1,
                        "requiresUserApproval": True,
                    },
                )
            )

    return suggestions
