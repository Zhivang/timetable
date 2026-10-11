from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator
from .common import AvailabilityStatus, ClassSessionType, TargetType


class AcademicPeriod(BaseModel):
    periodNumber: int = Field(..., ge=1, le=20)
    name: str = Field(..., min_length=1, max_length=50)
    startTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    endTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    durationMinutes: int = Field(..., gt=0)


class LunchBreak(BaseModel):
    name: str = "Lunch Break"
    startTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    endTime: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    durationMinutes: int = Field(..., gt=0)


class AcademicSettings(BaseModel):
    departmentName: str = Field(..., min_length=1, max_length=200)
    semester: str = Field(..., min_length=1, max_length=100)
    workingDays: List[str] = Field(..., min_length=1)
    periods: List[AcademicPeriod] = Field(..., min_length=1)
    lunchBreak: LunchBreak
    interPeriodGapMinutes: int = Field(default=5, ge=0)
    transitionBufferSameBuilding: int = Field(default=5, ge=0)
    transitionBufferDifferentBuilding: int = Field(default=15, ge=0)


class Building(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=150)
    code: str = Field(..., min_length=1, max_length=30)
    campusZone: str = Field(default="", max_length=100)
    description: Optional[str] = None


class Classroom(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    buildingId: str = Field(..., min_length=1, max_length=128)
    buildingName: str = Field(default="", max_length=150)
    name: str = Field(..., min_length=1, max_length=100)
    capacity: int = Field(..., gt=0)
    isShared: bool = False
    canHostTheory: bool = True
    canHostLaptopPractical: bool = True
    isDedicatedLab: bool = False
    facilities: List[str] = Field(default_factory=list)
    installedSoftware: List[str] = Field(default_factory=list)
    # Key: f"{day}_{periodNumber}"
    availability: Dict[str, AvailabilityStatus] = Field(default_factory=dict)


class Cohort(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=150)
    degreeProgramme: str = Field(..., min_length=1, max_length=150)
    academicYear: str = Field(default="Year 1", max_length=50)
    studentCount: int = Field(..., gt=0)
    availabilityRestrictions: Dict[str, bool] = Field(default_factory=dict)
    schedulingPreferences: Dict[str, Any] = Field(default_factory=dict)


class CombinedClass(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=150)
    cohortIds: List[str] = Field(..., min_length=2)
    cohortNames: List[str] = Field(default_factory=list)
    expectedAttendance: int = Field(..., gt=0)


class Teacher(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    name: str = Field(..., min_length=1, max_length=150)
    email: str = Field(..., min_length=3, max_length=150)
    title: str = Field(default="", max_length=80)
    department: str = Field(default="", max_length=150)
    subjectsCanTeach: List[str] = Field(default_factory=list)
    minWeeklyPeriods: int = Field(default=0, ge=0)
    maxWeeklyPeriods: int = Field(default=20, ge=1)
    availability: Dict[str, AvailabilityStatus] = Field(default_factory=dict)
    preferences: Dict[str, Any] = Field(default_factory=dict)


class SubjectOffering(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    targetType: TargetType
    targetId: str = Field(..., min_length=1, max_length=128)
    targetName: str = Field(default="", max_length=150)
    eligibleTeacherIds: List[str] = Field(..., min_length=1)
    assignedTeacherId: Optional[str] = None
    totalPeriodsPerWeek: int = Field(..., gt=0)
    theoryPeriods: int = Field(default=0, ge=0)
    flexiblePracticalPeriods: int = Field(default=0, ge=0)
    dedicatedLabPeriods: int = Field(default=0, ge=0)
    permissibleBlockLengths: List[int] = Field(default_factory=lambda: [1, 2])
    requiredSoftware: List[str] = Field(default_factory=list)
    requiredFacilities: List[str] = Field(default_factory=list)
    explicitMeetingPattern: Optional[str] = None

    @model_validator(mode="after")
    def validate_period_sum(self) -> "SubjectOffering":
        total_parts = self.theoryPeriods + self.flexiblePracticalPeriods + self.dedicatedLabPeriods
        if total_parts != self.totalPeriodsPerWeek:
            raise ValueError(
                f"Subject {self.code}: Sum of theory ({self.theoryPeriods}), "
                f"flexible ({self.flexiblePracticalPeriods}), and lab ({self.dedicatedLabPeriods}) "
                f"periods ({total_parts}) does not equal totalPeriodsPerWeek ({self.totalPeriodsPerWeek})."
            )
        return self


class LockedSlot(BaseModel):
    """
    Fixed/pinned timetable session that must be preserved exactly by the solver.
    """
    subjectOfferingId: str
    day: str
    startPeriod: int = Field(..., ge=1)
    blockLength: int = Field(default=1, ge=1, le=4)
    classroomId: str
    teacherId: str
    sessionType: ClassSessionType


class OptimizationWeights(BaseModel):
    minimizeRoomChanges: bool = True
    roomChangeWeight: int = Field(default=7, ge=0, le=10)
    minimizeBuildingChanges: bool = True
    buildingChangeWeight: int = Field(default=9, ge=0, le=10)
    avoidConsecutiveTheoryExceeding: int = Field(default=2, ge=1, le=5)
    consecutiveTheoryWeight: int = Field(default=8, ge=0, le=10)
    minimizeTeacherGaps: bool = True
    teacherGapWeight: int = Field(default=8, ge=0, le=10)
    minimizeCohortGaps: bool = True
    cohortGapWeight: int = Field(default=6, ge=0, le=10)
    groupTeachingIntoCompactBlocks: bool = True
    compactBlocksWeight: int = Field(default=5, ge=0, le=10)
    avoidExcessivelyLongStudentDays: bool = True
    maxStudentPeriodsPerDay: int = Field(default=5, ge=1, le=8)
    longDayPenaltyWeight: int = Field(default=6, ge=0, le=10)
    distributeTeachingUniformly: bool = True
    distributionWeight: int = Field(default=4, ge=0, le=10)


class SolverOptions(BaseModel):
    maxTimeInSeconds: float = Field(default=30.0, gt=0.0, le=300.0)
    numSearchWorkers: int = Field(default=8, ge=1, le=32)
    runDiagnosticsIfInfeasible: bool = True
    maxDiagnosticScenarios: int = Field(default=6, ge=1, le=20)


class SolveRequest(BaseModel):
    version: str = "1.0"
    academicSettings: AcademicSettings
    buildings: List[Building]
    classrooms: List[Classroom]
    cohorts: List[Cohort]
    combinedClasses: List[CombinedClass] = Field(default_factory=list)
    teachers: List[Teacher]
    subjectOfferings: List[SubjectOffering]
    schedulingPreferences: OptimizationWeights = Field(default_factory=OptimizationWeights)
    lockedSlots: List[LockedSlot] = Field(default_factory=list)
    options: SolverOptions = Field(default_factory=SolverOptions)
