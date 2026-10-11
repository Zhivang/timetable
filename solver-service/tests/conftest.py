import pytest
from app.schemas.common import AvailabilityStatus, ClassSessionType, TargetType
from app.schemas.request import (
    AcademicPeriod,
    AcademicSettings,
    Building,
    Classroom,
    Cohort,
    CombinedClass,
    LunchBreak,
    OptimizationWeights,
    SolverOptions,
    SolveRequest,
    SubjectOffering,
    Teacher,
)


@pytest.fixture
def sample_academic_settings() -> AcademicSettings:
    return AcademicSettings(
        departmentName="Department of Computer Science & Data Science",
        semester="Autumn Semester 2026",
        workingDays=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        periods=[
            AcademicPeriod(periodNumber=1, name="Period 1", startTime="09:30", endTime="10:20", durationMinutes=50),
            AcademicPeriod(periodNumber=2, name="Period 2", startTime="10:25", endTime="11:15", durationMinutes=50),
            AcademicPeriod(periodNumber=3, name="Period 3", startTime="11:20", endTime="12:10", durationMinutes=50),
            AcademicPeriod(periodNumber=4, name="Period 4", startTime="12:15", endTime="13:05", durationMinutes=50),
            AcademicPeriod(periodNumber=5, name="Period 5", startTime="13:10", endTime="13:50", durationMinutes=40),
            AcademicPeriod(periodNumber=6, name="Period 6", startTime="14:50", endTime="15:40", durationMinutes=50),
            AcademicPeriod(periodNumber=7, name="Period 7", startTime="15:45", endTime="16:35", durationMinutes=50),
        ],
        lunchBreak=LunchBreak(
            name="Lunch Break",
            startTime="13:50",
            endTime="14:50",
            durationMinutes=60,
        ),
        interPeriodGapMinutes=5,
        transitionBufferSameBuilding=5,
        transitionBufferDifferentBuilding=15,
    )


@pytest.fixture
def sample_buildings() -> list[Building]:
    return [
        Building(id="bld_ath", name="Alan Turing Hall", code="ATH", campusZone="North Campus"),
        Building(id="bld_alc", name="Ada Lovelace Complex", code="ALC", campusZone="Central Science Quad"),
        Building(id="bld_vnc", name="Von Neumann Centre", code="VNC", campusZone="Computing Hub"),
    ]


@pytest.fixture
def sample_classrooms(sample_academic_settings) -> list[Classroom]:
    days = sample_academic_settings.workingDays
    periods = [p.periodNumber for p in sample_academic_settings.periods]

    def full_avail(status=AvailabilityStatus.AVAILABLE):
        return {f"{d}_{p}": status for d in days for p in periods}

    return [
        Classroom(
            id="room_101",
            buildingId="bld_ath",
            buildingName="Alan Turing Hall",
            name="ATH-101",
            capacity=70,
            isShared=False,
            canHostTheory=True,
            canHostLaptopPractical=True,
            isDedicatedLab=False,
            facilities=["Whiteboard", "Smartboard", "Projector"],
            installedSoftware=[],
            availability=full_avail(),
        ),
        Classroom(
            id="room_lt2",
            buildingId="bld_ath",
            buildingName="Alan Turing Hall",
            name="ATH-LT2",
            capacity=130,
            isShared=False,
            canHostTheory=True,
            canHostLaptopPractical=True,
            isDedicatedLab=False,
            facilities=["Tiered Seating", "Dual Projectors", "Audio System"],
            installedSoftware=[],
            availability=full_avail(),
        ),
        Classroom(
            id="room_lab3a",
            buildingId="bld_alc",
            buildingName="Ada Lovelace Complex",
            name="ALC-Lab 3A",
            capacity=55,
            isShared=False,
            canHostTheory=True,
            canHostLaptopPractical=True,
            isDedicatedLab=True,
            facilities=["Workstation PCs", "Whiteboard"],
            installedSoftware=["Python/Jupyter", "PostgreSQL", "Docker", "RStudio"],
            availability=full_avail(),
        ),
        Classroom(
            id="room_ai_lab",
            buildingId="bld_vnc",
            buildingName="Von Neumann Centre",
            name="VNC-AI Lab",
            capacity=35,
            isShared=False,
            canHostTheory=True,
            canHostLaptopPractical=True,
            isDedicatedLab=True,
            facilities=["Workstation PCs", "Smartboard"],
            installedSoftware=["PyTorch", "CUDA GPU", "Docker", "JupyterLab"],
            availability=full_avail(),
        ),
        Classroom(
            id="room_shared_b",
            buildingId="bld_ath",
            buildingName="Alan Turing Hall",
            name="ATH-Shared B",
            capacity=80,
            isShared=True,
            canHostTheory=True,
            canHostLaptopPractical=False,
            isDedicatedLab=False,
            facilities=["Projector"],
            installedSoftware=[],
            availability={
                **full_avail(AvailabilityStatus.UNKNOWN),
                "Monday_1": AvailabilityStatus.AVAILABLE,
                "Monday_2": AvailabilityStatus.AVAILABLE,
                "Tuesday_3": AvailabilityStatus.AVAILABLE,
                "Tuesday_4": AvailabilityStatus.AVAILABLE,
            },
        ),
    ]


@pytest.fixture
def sample_cohorts() -> list[Cohort]:
    return [
        Cohort(id="cohort_bsc_y1", name="BSc Data Science Year 1", degreeProgramme="BSc Data Science", studentCount=65),
        Cohort(id="cohort_bsc_y2", name="BSc Data Science Year 2", degreeProgramme="BSc Data Science", studentCount=50),
        Cohort(id="cohort_msc_y1", name="MSc Data Science Year 1", degreeProgramme="MSc Data Science", studentCount=30),
    ]


@pytest.fixture
def sample_combined_classes() -> list[CombinedClass]:
    return [
        CombinedClass(
            id="comb_ds_ai",
            name="DS & AI Combined Foundations",
            cohortIds=["cohort_bsc_y1", "cohort_bsc_y2"],
            cohortNames=["BSc Data Science Year 1", "BSc Data Science Year 2"],
            expectedAttendance=105,  # Explicit attendance
        )
    ]


@pytest.fixture
def sample_teachers(sample_academic_settings) -> list[Teacher]:
    days = sample_academic_settings.workingDays
    periods = [p.periodNumber for p in sample_academic_settings.periods]

    def full_avail():
        return {f"{d}_{p}": AvailabilityStatus.AVAILABLE for d in days for p in periods}

    # Teacher with Saturday unavailable (testing unavailable periods)
    erostova_avail = full_avail()
    for p in periods:
        erostova_avail[f"Saturday_{p}"] = AvailabilityStatus.UNAVAILABLE

    return [
        Teacher(
            id="t_asmith",
            name="Dr. Alan Smith",
            email="a.smith@university.ac.uk",
            department="Data Science",
            subjectsCanTeach=["CS101", "DS102", "AI301"],
            minWeeklyPeriods=4,
            maxWeeklyPeriods=16,
            availability=full_avail(),
        ),
        Teacher(
            id="t_erostova",
            name="Prof. Elena Rostova",
            email="e.rostova@university.ac.uk",
            department="Machine Learning",
            subjectsCanTeach=["AI301", "DS502"],
            minWeeklyPeriods=4,
            maxWeeklyPeriods=12,
            availability=erostova_avail,
        ),
        Teacher(
            id="t_mvance",
            name="Dr. Marcus Vance",
            email="m.vance@university.ac.uk",
            department="Systems Engineering",
            subjectsCanTeach=["DS201"],
            minWeeklyPeriods=4,
            maxWeeklyPeriods=16,
            availability=full_avail(),
        ),
        Teacher(
            id="t_ppatel",
            name="Dr. Priya Patel",
            email="p.patel@university.ac.uk",
            department="Statistics",
            subjectsCanTeach=["DS202"],
            minWeeklyPeriods=4,
            maxWeeklyPeriods=16,
            availability=full_avail(),
        ),
    ]


@pytest.fixture
def sample_subject_offerings() -> list[SubjectOffering]:
    return [
        SubjectOffering(
            id="sub_cs101",
            code="CS101",
            name="Discrete Mathematics",
            targetType=TargetType.COHORT,
            targetId="cohort_bsc_y1",
            eligibleTeacherIds=["t_asmith"],
            totalPeriodsPerWeek=3,
            theoryPeriods=2,
            flexiblePracticalPeriods=1,
            dedicatedLabPeriods=0,
            permissibleBlockLengths=[1, 2],
        ),
        SubjectOffering(
            id="sub_ds201",
            code="DS201",
            name="Database Architecture",
            targetType=TargetType.COHORT,
            targetId="cohort_bsc_y2",
            eligibleTeacherIds=["t_mvance"],
            totalPeriodsPerWeek=4,
            theoryPeriods=2,
            flexiblePracticalPeriods=0,
            dedicatedLabPeriods=2,
            permissibleBlockLengths=[2],
            requiredSoftware=["PostgreSQL", "Docker"],
        ),
        SubjectOffering(
            id="sub_ai301",
            code="AI301",
            name="Interdisciplinary Machine Learning",
            targetType=TargetType.COMBINED,
            targetId="comb_ds_ai",
            eligibleTeacherIds=["t_erostova", "t_asmith"],
            assignedTeacherId="t_erostova",
            totalPeriodsPerWeek=2,
            theoryPeriods=2,
            flexiblePracticalPeriods=0,
            dedicatedLabPeriods=0,
            permissibleBlockLengths=[2],
        ),
        SubjectOffering(
            id="sub_ds502",
            code="DS502",
            name="Advanced Deep Learning",
            targetType=TargetType.COHORT,
            targetId="cohort_msc_y1",
            eligibleTeacherIds=["t_erostova"],
            totalPeriodsPerWeek=3,
            theoryPeriods=1,
            flexiblePracticalPeriods=0,
            dedicatedLabPeriods=2,
            permissibleBlockLengths=[1, 2],
            requiredSoftware=["PyTorch", "CUDA GPU"],
        ),
    ]


@pytest.fixture
def feasible_request(
    sample_academic_settings,
    sample_buildings,
    sample_classrooms,
    sample_cohorts,
    sample_combined_classes,
    sample_teachers,
    sample_subject_offerings,
) -> SolveRequest:
    return SolveRequest(
        academicSettings=sample_academic_settings,
        buildings=sample_buildings,
        classrooms=sample_classrooms,
        cohorts=sample_cohorts,
        combinedClasses=sample_combined_classes,
        teachers=sample_teachers,
        subjectOfferings=sample_subject_offerings,
        schedulingPreferences=OptimizationWeights(),
        options=SolverOptions(maxTimeInSeconds=15.0),
    )
