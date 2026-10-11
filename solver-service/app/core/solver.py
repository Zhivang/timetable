import time
from typing import List, Optional, Tuple
from ortools.sat.python import cp_model
from ..config import settings
from ..schemas.common import SolverStatus
from ..schemas.request import SolveRequest
from ..schemas.response import (
    DiagnosticSuggestion,
    ScheduledSlot,
    SolveResponse,
    SolverStatistics,
    UnassignedRequirement,
)
from .model_builder import TimetableModelBuilder
from .diagnostics import evaluate_infeasibility_diagnostics


def solve_timetable(
    request: SolveRequest,
    skip_diagnostics: bool = False,
) -> SolveResponse:
    """
    Constructs the CP-SAT model, invokes Google OR-Tools solver,
    extracts placements and statistics, and runs diagnostic what-if evaluations if infeasible.
    """
    builder = TimetableModelBuilder(request)
    model = builder.build()

    solver = cp_model.CpSolver()
    # Configure CP-SAT parameters
    solver.parameters.max_time_in_seconds = request.options.maxTimeInSeconds
    max_workers = getattr(settings, "MAX_SOLVER_WORKERS", 2)
    solver.parameters.num_workers = min(request.options.numSearchWorkers, max_workers) if max_workers > 0 else request.options.numSearchWorkers
    solver.parameters.log_search_progress = False

    start_wall_time = time.perf_counter()
    status_code = solver.Solve(model)
    end_wall_time = time.perf_counter()

    wall_time_seconds = round(end_wall_time - start_wall_time, 4)

    # Map CP-SAT status accurately
    # cp_model.OPTIMAL = 4
    # cp_model.FEASIBLE = 2
    # cp_model.INFEASIBLE = 3
    # cp_model.MODEL_INVALID = 1
    # cp_model.UNKNOWN = 0

    slots: List[ScheduledSlot] = []
    unassigned: List[UnassignedRequirement] = []
    diagnostics: List[DiagnosticSuggestion] = []

    is_optimal = status_code == cp_model.OPTIMAL
    is_feasible = status_code in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    if status_code == cp_model.OPTIMAL:
        status = SolverStatus.OPTIMAL
        status_message = "Optimal timetable found with mathematical proof of optimality."
    elif status_code == cp_model.FEASIBLE:
        status = SolverStatus.FEASIBLE
        status_message = (
            "Valid feasible timetable found satisfying all hard constraints. "
            "Search concluded before proving objective optimality (time or search limit reached)."
        )
    elif status_code == cp_model.INFEASIBLE:
        status = SolverStatus.INFEASIBLE
        status_message = (
            "The model is mathematically infeasible. One or more hard constraints cannot be satisfied "
            "with the provided classrooms, teacher capacities, or required periods."
        )
    else:
        status = SolverStatus.UNKNOWN
        status_message = (
            "Solver search concluded without establishing feasibility or infeasibility "
            "within the configured time limit."
        )

    # Extract slots if a solution was found
    if is_feasible:
        for meeting in builder.meetings:
            assigned = False
            for cand in builder.candidates[meeting.meeting_id]:
                var = builder.x[(meeting.meeting_id, cand.candidate_id)]
                if solver.Value(var) == 1:
                    assigned = True
                    for p_num in cand.occupied_periods:
                        slots.append(
                            ScheduledSlot(
                                id=f"slot_{cand.candidate_id}_{p_num}",
                                day=cand.day,
                                periodNumber=p_num,
                                occupiedPeriods=list(cand.occupied_periods),
                                blockLength=meeting.block_length,
                                subjectOfferingId=meeting.subject_id,
                                subjectCode=meeting.subject_code,
                                subjectName=meeting.subject_name,
                                sessionType=meeting.session_type,
                                classroomId=cand.classroom_id,
                                classroomName=cand.classroom_name,
                                buildingId=cand.building_id,
                                buildingCode=cand.building_code,
                                buildingName=cand.building_name,
                                teacherId=cand.teacher_id,
                                teacherName=cand.teacher_name,
                                targetType=meeting.target_type,
                                targetId=meeting.target_id,
                                targetName=meeting.target_name,
                                cohortIds=list(meeting.target_cohort_ids),
                            )
                        )
                    break

            if not assigned:
                unassigned.append(
                    UnassignedRequirement(
                        subjectOfferingId=meeting.subject_id,
                        subjectCode=meeting.subject_code,
                        sessionType=meeting.session_type,
                        periodsNeeded=meeting.block_length,
                        reason="No feasible slot assigned within model bounds.",
                    )
                )

    # If infeasible and diagnostics are enabled:
    if (
        status == SolverStatus.INFEASIBLE
        and not skip_diagnostics
        and request.options.runDiagnosticsIfInfeasible
    ):
        diagnostics = evaluate_infeasibility_diagnostics(
            request, max_scenarios=request.options.maxDiagnosticScenarios
        )

    # Solver statistics
    obj_val: Optional[float] = None
    best_bound: Optional[float] = None
    if is_feasible:
        try:
            obj_val = float(solver.ObjectiveValue())
            best_bound = float(solver.BestObjectiveBound())
        except Exception:
            pass

    stats = SolverStatistics(
        wallTimeSeconds=wall_time_seconds,
        numVariables=model.Proto().variables.__len__(),
        numConstraints=model.Proto().constraints.__len__(),
        numBranches=solver.NumBranches(),
        numConflicts=solver.NumConflicts(),
        objectiveValue=obj_val,
        bestObjectiveBound=best_bound,
    )

    return SolveResponse(
        version="1.0",
        status=status,
        statusMessage=status_message,
        isOptimal=is_optimal,
        isFeasible=is_feasible,
        objectiveScore=obj_val,
        slots=slots,
        unassigned=unassigned,
        statistics=stats,
        diagnostics=diagnostics,
        validationErrors=[],
    )
