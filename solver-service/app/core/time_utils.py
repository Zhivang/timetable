from typing import Dict, List, Tuple
from ..schemas.request import AcademicPeriod, AcademicSettings, LunchBreak


def parse_time_to_minutes(time_str: str) -> int:
    """Parses 'HH:MM' into total minutes since 00:00."""
    parts = time_str.strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])


def is_block_consecutive_and_valid(
    start_period: int,
    block_length: int,
    periods_map: Dict[int, AcademicPeriod],
    lunch_break: LunchBreak,
) -> bool:
    """
    Checks that:
    1. All periods [start_period, start_period + block_length - 1] exist in periods_map.
    2. The block does not span or cross the lunch break window.
    3. The periods are strictly consecutive adjacent teaching periods.
    """
    period_numbers = list(range(start_period, start_period + block_length))
    for p_num in period_numbers:
        if p_num not in periods_map:
            return False

    lunch_start = parse_time_to_minutes(lunch_break.startTime)
    lunch_end = parse_time_to_minutes(lunch_break.endTime)

    # Check each period in the block doesn't overlap lunch
    for p_num in period_numbers:
        p = periods_map[p_num]
        p_start = parse_time_to_minutes(p.startTime)
        p_end = parse_time_to_minutes(p.endTime)

        # Overlaps lunch if p_start < lunch_end and p_end > lunch_start
        if max(p_start, lunch_start) < min(p_end, lunch_end):
            return False

    # Check that periods within the block are adjacent with no lunch intervening
    if block_length > 1:
        first_p = periods_map[start_period]
        last_p = periods_map[start_period + block_length - 1]
        first_start = parse_time_to_minutes(first_p.startTime)
        last_end = parse_time_to_minutes(last_p.endTime)

        # If lunch starts between first_start and last_end, the block is invalid!
        if first_start < lunch_end and last_end > lunch_start:
            return False

    return True


def get_transition_gap_minutes(
    period_from: AcademicPeriod,
    period_to: AcademicPeriod,
) -> int:
    """
    Calculates the actual elapsed clock minutes between the end of period_from
    and the start of period_to on the same day.
    """
    end_from = parse_time_to_minutes(period_from.endTime)
    start_to = parse_time_to_minutes(period_to.startTime)
    return start_to - end_from


def is_travel_time_feasible(
    period_from: AcademicPeriod,
    period_to: AcademicPeriod,
    building_from_id: str,
    building_to_id: str,
    settings: AcademicSettings,
) -> bool:
    """
    Rule L: Building transitions must respect travel-time rules using actual
    period start and end times.
    """
    available_gap = get_transition_gap_minutes(period_from, period_to)
    if available_gap < 0:
        return False

    required_buffer = (
        settings.transitionBufferSameBuilding
        if building_from_id == building_to_id
        else settings.transitionBufferDifferentBuilding
    )

    return available_gap >= required_buffer
