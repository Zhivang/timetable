# University Department Timetable Solver Service

Production mathematical constraint programming microservice for automated university timetable generation, powered by **FastAPI** and **Google OR-Tools CP-SAT (Constraint Programming - Satisfiability)**.

This standalone service receives structured academic timetable requirements, validates relational domain constraints, constructs a rigorous discrete constraint satisfaction and optimization model, and executes the OR-Tools CP-SAT solver.

---

## Architecture & Technology Stack

- **Runtime**: Python 3.10+ / 3.11
- **Web Framework**: FastAPI (ASGI) with Pydantic v2 data models
- **Optimization Engine**: Google OR-Tools CP-SAT (`ortools.sat.python.cp_model`)
- **Containerization**: Docker (optimized for Google Cloud Run)
- **Test Suite**: Pytest with 18 automated unit and integration tests

---

## Configuration & Environment Variables

The service is configured using standard environment variables (or a local `.env` file):

| Variable | Description | Default | Production Requirement |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | Environment mode (`development` or `production`) | `development` | Recommended `production` |
| `SOLVER_API_KEY` | Shared secret key for authenticating caller services | `None` | **Mandatory in production** (fails closed if missing) |
| `HOST` | Server bind host address | `0.0.0.0` | Optional |
| `PORT` | HTTP port to listen on | `8000` | Cloud Run automatically injects `$PORT` |

### Security & Fail-Closed Authentication

1. The service validates caller authorization using the `X-API-Key` header or `Authorization: Bearer <token>`.
2. All comparisons are executed using constant-time verification (`secrets.compare_digest`) to prevent timing side-channel attacks.
3. **Fail-Closed Guarantee**: In `production` mode, if `SOLVER_API_KEY` is unset or blank, all incoming `/solve` requests immediately fail with HTTP 500/401 and are rejected.

---

## API Specification

### 1. `GET /health`
Returns service availability, solver engine version, and readiness status.

**Response (HTTP 200)**:
```json
{
  "status": "healthy",
  "service": "Department Timetable Solver Service",
  "version": "1.0.0",
  "solverEngine": "Google OR-Tools (CP-SAT v9.15)",
  "environment": "production",
  "authConfigured": true
}
```

---

### 2. `POST /solve`
Validates input data, compiles the mathematical model, executes CP-SAT, and returns the solved schedule.

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: <YOUR_SOLVER_API_KEY>`

#### Request Body Structure
```json
{
  "version": "1.0",
  "academicSettings": {
    "departmentName": "Department of Computer Science & Data Science",
    "semester": "Autumn Semester 2026",
    "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "periods": [
      { "periodNumber": 1, "name": "Period 1", "startTime": "09:30", "endTime": "10:20", "durationMinutes": 50 },
      { "periodNumber": 2, "name": "Period 2", "startTime": "10:25", "endTime": "11:15", "durationMinutes": 50 },
      { "periodNumber": 3, "name": "Period 3", "startTime": "11:20", "endTime": "12:10", "durationMinutes": 50 },
      { "periodNumber": 4, "name": "Period 4", "startTime": "12:15", "endTime": "13:05", "durationMinutes": 50 },
      { "periodNumber": 5, "name": "Period 5", "startTime": "13:10", "endTime": "13:50", "durationMinutes": 40 },
      { "periodNumber": 6, "name": "Period 6", "startTime": "14:50", "endTime": "15:40", "durationMinutes": 50 },
      { "periodNumber": 7, "name": "Period 7", "startTime": "15:45", "endTime": "16:35", "durationMinutes": 50 }
    ],
    "lunchBreak": {
      "name": "Lunch Break",
      "startTime": "13:50",
      "endTime": "14:50",
      "durationMinutes": 60
    },
    "interPeriodGapMinutes": 5,
    "transitionBufferSameBuilding": 5,
    "transitionBufferDifferentBuilding": 15
  },
  "buildings": [
    { "id": "bld_ath", "name": "Alan Turing Hall", "code": "ATH", "campusZone": "North Campus" }
  ],
  "classrooms": [
    {
      "id": "room_101",
      "buildingId": "bld_ath",
      "buildingName": "Alan Turing Hall",
      "name": "ATH-101",
      "capacity": 70,
      "isShared": false,
      "canHostTheory": true,
      "canHostLaptopPractical": true,
      "isDedicatedLab": false,
      "facilities": ["Whiteboard", "Smartboard", "Projector"],
      "installedSoftware": [],
      "availability": { "Monday_1": "available", "Monday_2": "available" }
    }
  ],
  "cohorts": [
    { "id": "cohort_bsc_y1", "name": "BSc Data Science Year 1", "degreeProgramme": "BSc Data Science", "studentCount": 65 }
  ],
  "combinedClasses": [],
  "teachers": [
    {
      "id": "t_asmith",
      "name": "Dr. Alan Smith",
      "email": "a.smith@university.ac.uk",
      "department": "Data Science",
      "subjectsCanTeach": ["CS101"],
      "minWeeklyPeriods": 4,
      "maxWeeklyPeriods": 16,
      "availability": { "Monday_1": "available", "Monday_2": "available" }
    }
  ],
  "subjectOfferings": [
    {
      "id": "sub_cs101",
      "code": "CS101",
      "name": "Discrete Mathematics",
      "targetType": "cohort",
      "targetId": "cohort_bsc_y1",
      "eligibleTeacherIds": ["t_asmith"],
      "totalPeriodsPerWeek": 2,
      "theoryPeriods": 2,
      "flexiblePracticalPeriods": 0,
      "dedicatedLabPeriods": 0,
      "permissibleBlockLengths": [2]
    }
  ],
  "schedulingPreferences": {
    "minimizeRoomChanges": true,
    "roomChangeWeight": 7,
    "minimizeBuildingChanges": true,
    "buildingChangeWeight": 9,
    "avoidConsecutiveTheoryExceeding": 2,
    "consecutiveTheoryWeight": 8,
    "minimizeTeacherGaps": true,
    "teacherGapWeight": 8
  },
  "lockedSlots": [],
  "options": {
    "maxTimeInSeconds": 30.0,
    "numSearchWorkers": 8,
    "runDiagnosticsIfInfeasible": true,
    "maxDiagnosticScenarios": 6
  }
}
```

#### Response Structure (Feasible / Optimal)
```json
{
  "version": "1.0",
  "status": "OPTIMAL",
  "statusMessage": "Optimal timetable found with mathematical proof of optimality.",
  "isOptimal": true,
  "isFeasible": true,
  "objectiveScore": 0.0,
  "slots": [
    {
      "id": "slot_sub_cs101_th_1_Monday_1_room_101_t_asmith_1",
      "day": "Monday",
      "periodNumber": 1,
      "occupiedPeriods": [1, 2],
      "blockLength": 2,
      "subjectOfferingId": "sub_cs101",
      "subjectCode": "CS101",
      "subjectName": "Discrete Mathematics",
      "sessionType": "theory",
      "classroomId": "room_101",
      "classroomName": "ATH-101",
      "buildingId": "bld_ath",
      "buildingCode": "ATH",
      "buildingName": "Alan Turing Hall",
      "teacherId": "t_asmith",
      "teacherName": "Dr. Alan Smith",
      "targetType": "cohort",
      "targetId": "cohort_bsc_y1",
      "targetName": "BSc Data Science Year 1",
      "cohortIds": ["cohort_bsc_y1"]
    }
  ],
  "unassigned": [],
  "statistics": {
    "wallTimeSeconds": 0.042,
    "numVariables": 284,
    "numConstraints": 412,
    "numBranches": 0,
    "numConflicts": 0,
    "objectiveValue": 0.0,
    "bestObjectiveBound": 0.0
  },
  "diagnostics": [],
  "validationErrors": []
}
```

---

## Mathematical Hard Constraints (Strictly Enforced)

| Rule | Mathematical Description |
| :--- | :--- |
| **Rule A** | **Room Conflict Free**: At most 1 session per room at any `(day, period)`. |
| **Rule B** | **Teacher Conflict Free**: At most 1 session per instructor at any `(day, period)`. |
| **Rule C** | **Cohort Conflict Free**: At most 1 session per student cohort at any `(day, period)`. Combined sessions reserve all participating cohorts concurrently. |
| **Rule D** | **Seating Capacity**: Assigned room capacity $\ge$ expected attendance. |
| **Rule E** | **Teacher Availability & Eligibility**: Only assign qualified eligible teachers during explicit `available` periods. |
| **Rule F** | **Room Availability**: Only assign rooms during explicit `available` periods (`unknown` shared room availability is rejected). |
| **Rule G & H** | **Room Capability**: Dedicated labs are strictly enforced for dedicated lab practicals, requiring all requested software/equipment tags. |
| **Rule I** | **Exact Period Counts**: Scheduled periods match $T_s + F_s + L_s = \text{totalPeriodsPerWeek}$ exactly. |
| **Rule J** | **Teacher Workload Bounds**: Instructor teaching sum $\le \text{maxWeeklyPeriods}$. |
| **Rule K** | **Manually Locked Slots**: Pinned entries are locked into exact `(day, period, room, teacher)`. |
| **Rule L** | **Building Transition & Travel-Time**: Cross-building movement requires available gap $\ge \text{transitionBufferDifferentBuilding}$. |
| **Rule M** | **Boundary Enforcement**: No sessions across lunch (13:50–14:50) or outside configured days/periods. |

---

## Infeasibility Handling & Empirical Diagnostics

If any set of hard constraints cannot be satisfied, the solver returns `status: "INFEASIBLE"` with `slots: []`. **No timetable is ever fabricated.**

When `runDiagnosticsIfInfeasible: true`, the service evaluates separate **what-if CP-SAT models**:
1. Testing unknown periods in shared rooms.
2. Testing incrementing teacher maximum weekly period limits (+2 periods).
3. Testing releasing blocked teacher leaves.
4. Testing proposed subject requirement reductions (flagged as proposals requiring explicit administrator approval).

A diagnostic suggestion is **only reported if the modified model was actually evaluated**, displaying whether the proposed change allowed a feasible solution.

---

## Running Locally

### 1. Create Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run Automated Test Suite
```bash
PYTHONPATH=. pytest tests -v
```

### 3. Start Service with Uvicorn
```bash
export ENVIRONMENT=development
export SOLVER_API_KEY=dev-secret-key
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Test health:
```bash
curl http://localhost:8000/health
```

---

## Deploying to Render (Free Web Service)

You can host this standalone solver on [Render](https://render.com) using its **Free Web Service Tier** (no credit card or paid services required).

### Option A: Docker Deployment (Recommended)

Render can build the container directly using the repository's `Dockerfile`:

1. **Push your code to GitHub** (public or private repository).
2. Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your repository.
4. Configure the Web Service settings:
   - **Name**: `department-timetable-solver` (or any name you prefer)
   - **Region**: Choose the region closest to your users (e.g., `Singapore`, `Frankfurt`, `Oregon`, `Ohio`)
   - **Branch**: `main`
   - **Root Directory**: `solver-service`
   - **Environment**: **Docker**
   - **Docker Command**: Leave default (the Dockerfile `CMD` runs uvicorn)
   - **Instance Type**: **Free** (0.1 CPU, 512 MB RAM)
5. Under **Environment Variables**, add the following:
   - `ENVIRONMENT` = `production`
   - `SOLVER_API_KEY` = `<your-generated-random-secret-key>` *(e.g. run `openssl rand -hex 32` locally to generate)*
   - `WEB_CONCURRENCY` = `1` *(ensures 1 ASGI process to stay well under 512 MB RAM)*
   - `MAX_SOLVER_WORKERS` = `2` *(limits CP-SAT solver threads for low-vCPU instances)*
6. Click **Create Web Service**.
7. Render will build the Docker container and start the service.
   - The `/health` endpoint is available at `https://<your-service-name>.onrender.com/health`
   - Render automatically injects `PORT=10000`, which our Dockerfile and `app/config.py` bind to automatically.

---

### Option B: Native Python 3 Environment (Alternative)

If you prefer deploying without Docker:

1. In Render Dashboard, click **New +** > **Web Service** and connect your repository.
2. Configure settings:
   - **Root Directory**: `solver-service`
   - **Environment**: **Python 3**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1`
   - **Instance Type**: **Free**
3. Add Environment Variables:
   - `ENVIRONMENT` = `production`
   - `SOLVER_API_KEY` = `<your-generated-random-secret-key>`
   - `PYTHON_VERSION` = `3.11.8`
   - `MAX_SOLVER_WORKERS` = `2`
4. Click **Create Web Service**.

---

### Connecting Render Solver to the Google AI Studio Application

Once deployed on Render, copy your service's URL (e.g. `https://department-timetable-solver.onrender.com`).

In your Google AI Studio app environment or hosting setup, configure:

```env
SOLVER_SERVICE_URL=https://department-timetable-solver.onrender.com
SOLVER_API_KEY=<the-same-solver-api-key-you-entered-in-render>
```

> **Note on Render Free Tier Sleep**: Render spins down inactive free web services after 15 minutes of inactivity. When the first request arrives, it takes ~30–50 seconds to cold start. The `/health` check in the dashboard will reflect "Ready" once active.

---

## Deploying to Google Cloud Run (Alternative)

### Step 1: Set Google Cloud Project
```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

### Step 2: Store Solver API Key in Secret Manager
```bash
echo -n "GENERATED_RANDOM_SECRET_KEY" | gcloud secrets create timetable-solver-api-key --data-file=-
```

### Step 3: Build & Deploy Container to Cloud Run
From inside the `solver-service/` directory:
```bash
gcloud run deploy timetable-solver-service \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars ENVIRONMENT=production \
  --set-secrets SOLVER_API_KEY=timetable-solver-api-key:latest
```

The command will output the HTTPS service URL, for example:
`https://timetable-solver-service-xyz.a.run.app`

### Step 4: Connect with Node.js Frontend Application
In your Node.js application's environment:
```env
SOLVER_SERVICE_URL=https://timetable-solver-service-xyz.a.run.app
SOLVER_API_KEY=GENERATED_RANDOM_SECRET_KEY
```
The Node.js server proxy (`/api/solver/generate`) will seamlessly relay requests to this microservice.
