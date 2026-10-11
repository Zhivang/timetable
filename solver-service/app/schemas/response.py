from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from .common import ClassSessionType, SolverStatus, TargetType


class ScheduledSlot(BaseModel):
    id: str
    day: str
    periodNumber: int
    occupiedPeriods: List[int]
    blockLength: int
    subjectOfferingId: str
    subjectCode: str
    subjectName: str
    sessionType: ClassSessionType
    classroomId: str
    classroomName: str
    buildingId: str
    buildingCode: str
    buildingName: str
    teacherId: str
    teacherName: str
    targetType: TargetType
    targetId: str
    targetName: str
    cohortIds: List[str]


class UnassignedRequirement(BaseModel):
    subjectOfferingId: str
    subjectCode: str
    sessionType: ClassSessionType
    periodsNeeded: int
    reason: str


class SolverStatistics(BaseModel):
    wallTimeSeconds: float
    numVariables: int
    numConstraints: int
    numBranches: int = 0
    numConflicts: int = 0
    objectiveValue: Optional[float] = None
    bestObjectiveBound: Optional[float] = None


class DiagnosticSuggestion(BaseModel):
    """
    Empirically evaluated what-if test result for infeasible model resolution.
    Only proposed if the modified model was actually evaluated.
    """
    category: str
    scenarioDescription: str
    tested: bool = True
    resultStatus: SolverStatus
    allowsFeasibleSolution: bool
    explanation: str
    proposedChange: Dict[str, Any]


class SolveResponse(BaseModel):
    version: str = "1.0"
    status: SolverStatus
    statusMessage: str
    isOptimal: bool
    isFeasible: bool
    objectiveScore: Optional[float] = None
    slots: List[ScheduledSlot] = Field(default_factory=list)
    unassigned: List[UnassignedRequirement] = Field(default_factory=list)
    statistics: SolverStatistics
    diagnostics: List[DiagnosticSuggestion] = Field(default_factory=list)
    validationErrors: List[str] = Field(default_factory=list)
