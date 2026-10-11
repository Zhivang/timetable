from enum import Enum


class SolverStatus(str, Enum):
    OPTIMAL = "OPTIMAL"
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    UNKNOWN = "UNKNOWN"
    INVALID_INPUT = "INVALID_INPUT"


class ClassSessionType(str, Enum):
    THEORY = "theory"
    FLEXIBLE_PRACTICAL = "flexible_practical"
    DEDICATED_LAB = "dedicated_lab"


class AvailabilityStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"


class TargetType(str, Enum):
    COHORT = "cohort"
    COMBINED = "combined"
