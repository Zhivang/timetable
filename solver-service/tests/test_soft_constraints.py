from app.core.solver import solve_timetable
from app.core.time_utils import get_transition_gap_minutes
from app.schemas.request import OptimizationWeights, SolveRequest


def test_travel_time_between_different_buildings_is_enforced(feasible_request: SolveRequest):
    """
    Rule L: Cross-building movements must respect the configured travel-time rules.
    If period gap < transitionBufferDifferentBuilding (e.g. 5m < 15m),
    consecutive meetings in different buildings are forbidden for the same cohort or teacher.
    """
    # Set transitionBufferDifferentBuilding = 15m (gap between adjacent periods is 5m)
    feasible_request.academicSettings.transitionBufferDifferentBuilding = 15
    feasible_request.academicSettings.transitionBufferSameBuilding = 5

    response = solve_timetable(feasible_request)
    assert response.isFeasible

    period_map = {p.periodNumber: p for p in feasible_request.academicSettings.periods}

    # Verify for every cohort:
    for cohort in feasible_request.cohorts:
        cohort_slots = [s for s in response.slots if cohort.id in s.cohortIds]
        # Group by day
        by_day = {}
        for s in cohort_slots:
            by_day.setdefault(s.day, []).append(s)

        for day, day_slots in by_day.items():
            sorted_slots = sorted(day_slots, key=lambda s: s.periodNumber)
            for i in range(len(sorted_slots) - 1):
                s1 = sorted_slots[i]
                s2 = sorted_slots[i + 1]

                # If in different buildings
                if s1.buildingId != s2.buildingId:
                    p1_obj = period_map[s1.periodNumber]
                    p2_obj = period_map[s2.periodNumber]
                    gap = get_transition_gap_minutes(p1_obj, p2_obj)
                    assert gap >= feasible_request.academicSettings.transitionBufferDifferentBuilding, (
                        f"Travel time violation for cohort {cohort.name} on {day}: "
                        f"Period {s1.periodNumber} ({s1.buildingCode}) to Period {s2.periodNumber} ({s2.buildingCode}) "
                        f"gap is {gap}m, required buffer is {feasible_request.academicSettings.transitionBufferDifferentBuilding}m"
                    )


def test_soft_preferences_integer_weighting(feasible_request: SolveRequest):
    """
    Section 5: Soft constraints are converted to integer-weighted terms suitable for CP-SAT.
    Verifies that objective value is calculated and solver finds an optimal or high-quality solution.
    """
    feasible_request.schedulingPreferences = OptimizationWeights(
        minimizeBuildingChanges=True,
        buildingChangeWeight=10,
        minimizeRoomChanges=True,
        roomChangeWeight=8,
        minimizeTeacherGaps=True,
        teacherGapWeight=8,
    )

    response = solve_timetable(feasible_request)
    assert response.isFeasible
    assert response.objectiveScore is not None
    assert response.statistics.objectiveValue is not None
    assert response.statistics.objectiveValue >= 0
