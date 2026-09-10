from pydantic_settings import BaseSettings, NoDecode
from pydantic import field_validator
from typing import List, Union, Annotated
import json


def _parse_origins(value: Union[str, List[str]]) -> List[str]:
    """Accept every shape operators actually paste into Railway variables:
    JSON list, comma-separated list, or a single bare URL. Normalizes each
    origin (strips whitespace/quotes/trailing slashes) because browsers send
    `Origin` without a trailing slash — `https://app/` would otherwise never
    match `https://app` and CORS would fail silently."""
    if isinstance(value, str):
        text = value.strip()
        try:
            parsed = json.loads(text)
            items = parsed if isinstance(parsed, list) else [parsed]
        except (ValueError, TypeError):
            items = text.split(",")
    else:
        items = list(value)
    origins = []
    for item in items:
        o = str(item).strip().strip("'\"").rstrip("/")
        if o:
            origins.append(o)
    return origins


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://railsway:railsway@localhost:5432/railsway"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8
    # NoDecode: the raw env string must reach the validator below untouched,
    # otherwise pydantic-settings itself crashes on non-JSON values before
    # validation ever runs.
    ALLOWED_ORIGINS: Annotated[List[str], NoDecode] = ["http://localhost:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if v is None:
            return v
        return _parse_origins(v)
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    IR_API_BASE_URL: str = ""
    IR_API_KEY: str = ""
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
