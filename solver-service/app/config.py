import os
import secrets
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Settings:
    SERVICE_NAME: str = "Department Timetable Solver Service"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()

    # Secret API Key for authenticating caller services (Node backend / Cloud Run callers)
    # In production, must be provided. In development, defaults to development key if not set.
    SOLVER_API_KEY: Optional[str] = os.getenv("SOLVER_API_KEY")

    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    MAX_SOLVER_WORKERS: int = int(os.getenv("MAX_SOLVER_WORKERS", "2"))

    # Whether authentication is strictly required
    # Fails closed in production if key is missing or blank!
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT in ("production", "prod")

    def validate_api_key(self, provided_key: Optional[str]) -> bool:
        """
        Constant-time comparison against the configured server secret key.
        Fails closed if running in production without configured key.
        """
        if self.is_production:
            if not self.SOLVER_API_KEY:
                # Fail closed: No API key configured in production
                return False
            if not provided_key:
                return False
            return secrets.compare_digest(provided_key, self.SOLVER_API_KEY)

        # In non-production (e.g. development/testing):
        if not self.SOLVER_API_KEY:
            # In local dev without key configured, allow dev access with warning
            return True

        if not provided_key:
            return False

        return secrets.compare_digest(provided_key, self.SOLVER_API_KEY)


settings = Settings()
