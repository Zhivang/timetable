import copy
from app.core.solver import solve_timetable
from app.schemas.common import AvailabilityStatus, SolverStatus
from app.schemas.request import SolveRequest


def test_impossible_teacher_overload_returns_infeasible_never_fabricates(feasible_request: SolveRequest):
    """
    Deliberately infeasible dataset:
    Marcus Vance has maxWeeklyPeriods = 2, but is the sole eligible teacher
    for DS201 which requires 4 periods.
    The solver must return INFEASIBLE with 0 slots.
    """
    infeasible_req = copy.deepcopy(feasible_request)
    # Constrain Marcus Vance to max 2 periods
    for t in infeasible_req.teachers:
        if t.id == "t_mvance":
            t.maxWeeklyPeriods = 2

    response = solve_timetable(infeasible_req)

    assert not response.isFeasible
    assert response.status == SolverStatus.INFEASIBLE
    assert len(response.slots) == 0, "Solver must NEVER fabricate slots when mathematically infeasible!"
    assert "infeasible" in response.statusMessage.lower()


def test_infeasible_diagnostics_evaluates_what_if_and_reports_real_tests(feasible_request: SolveRequest):
    """
    Verifies that the diagnostic facility runs actual what-if scenario models
    and only reports empirically tested suggestions.
    """
    infeasible_req = copy.deepcopy(feasible_request)
    for t in infeasible_req.teachers:
        if t.id == "t_mvance":
            t.maxWeeklyPeriods = 2

    # Enable diagnostics
    infeasible_req.options.runDiagnosticsIfInfeasible = True
    infeasible_req.options.maxDiagnosticScenarios = 4

    response = solve_timetable(infeasible_req)

    assert response.status == SolverStatus.INFEASIBLE
    assert len(response.diagnostics) > 0

    for diag in response.diagnostics:
        assert diag.tested is True, "Suggestion must only be reported if actually evaluated!"
        assert diag.category in ("teacher_load", "teacher_availability", "room_availability", "subject_requirement_proposal")
        assert diag.explanation is not None

    # Finding the teacher load relaxation for Marcus Vance:
    vance_diag = next(
        (d for d in response.diagnostics if d.proposedChange.get("teacherId") == "t_mvance"),
        None,
    )
    if vance_diag:
        # Increasing Vance's capacity by 2 (+2) should make the model feasible!
        assert vance_diag.allowsFeasibleSolution is True


def test_impossible_room_unavailability_returns_infeasible(feasible_request: SolveRequest):
    """
    If the only room capable of hosting DS502 (AI Lab) is marked completely unavailable,
    the solver must return INFEASIBLE with 0 slots.
    """
    infeasible_req = copy.deepcopy(feasible_request)
    for r in infeasible_req.classrooms:
        if r.id == "room_ai_lab":
            # Mark all periods unavailable
            for k in r.availability.keys():
                r.availability[k] = AvailabilityStatus.UNAVAILABLE

    response = solve_timetable(infeasible_req)

    assert not response.isFeasible
    assert response.status == SolverStatus.INFEASIBLE
    assert len(response.slots) == 0
