import logging
from typing import Optional
from fastapi import Depends, FastAPI, Header, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .core.solver import solve_timetable
from .core.validator import validate_solve_request
from .schemas.common import SolverStatus
from .schemas.request import SolveRequest
from .schemas.response import SolveResponse, SolverStatistics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timetable-solver")

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.VERSION,
    description=(
        "Production University Department Timetable Constraint Optimization Microservice "
        "powered by Google OR-Tools CP-SAT."
    ),
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> None:
    """
    Enforces server-side API-key authentication.
    Checks 'X-API-Key' or 'Authorization: Bearer <token>'.
    Fails closed if production authentication is not configured.
    """
    provided_key = x_api_key
    if not provided_key and authorization:
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            provided_key = parts[1]
        elif len(parts) == 1:
            provided_key = parts[0]

    if not settings.validate_api_key(provided_key):
        if settings.is_production and not settings.SOLVER_API_KEY:
            logger.error("Production failure: SOLVER_API_KEY is not configured.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Solver authentication configuration failure. Service failed closed.",
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key for timetable solver service.",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/health", tags=["System"])
def get_health():
    """
    Service health check endpoint.
    Publicly accessible for Cloud Run and Kubernetes probes.
    """
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "solverEngine": "Google OR-Tools (CP-SAT v9.15)",
        "environment": settings.ENVIRONMENT,
        "authConfigured": bool(settings.SOLVER_API_KEY),
    }


@app.post(
    "/solve",
    response_model=SolveResponse,
    tags=["Optimization"],
    dependencies=[Depends(verify_api_key)],
)
def solve_timetable_endpoint(request: SolveRequest):
    """
    Validates department constraints and solves for optimal timetable placements.
    """
    # 1. Structural and relational validation
    validation_errors = validate_solve_request(request)
    if validation_errors:
        logger.warning("Input validation failed: %s", validation_errors)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=SolveResponse(
                version="1.0",
                status=SolverStatus.INVALID_INPUT,
                statusMessage=f"Input validation rejected: {len(validation_errors)} error(s) found.",
                isOptimal=False,
                isFeasible=False,
                objectiveScore=None,
                slots=[],
                unassigned=[],
                statistics=SolverStatistics(
                    wallTimeSeconds=0.0,
                    numVariables=0,
                    numConstraints=0,
                ),
                diagnostics=[],
                validationErrors=validation_errors,
            ).model_dump(),
        )

    # 2. Execute mathematical optimization solver
    try:
        response = solve_timetable(request)
        logger.info(
            "Solver finished with status %s in %.3fs (%d slots)",
            response.status,
            response.statistics.wallTimeSeconds,
            len(response.slots),
        )
        return response
    except Exception as exc:
        logger.exception("Unexpected error during timetable solving: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mathematical solver execution error: {str(exc)}",
        )
