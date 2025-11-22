import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://teamuser:secretpassword@localhost:5432/teamdb"
    )
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    APP_NAME: str = "Chat Application"
    DEBUG: bool = True

    # Add these fields
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str
    BACKEND_URL: str

    class Config:
        env_file = ".env"

settings = Settings()