from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://railsway:railsway@localhost:5432/railsway"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    IR_API_BASE_URL: str = ""
    IR_API_KEY: str = ""
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
