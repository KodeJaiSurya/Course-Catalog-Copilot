import os
from pydantic_settings import BaseSettings

# Suppress tokenizers parallelism warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    IMPORTANT: This project now uses Neon Postgres as the single database source.
    - DATABASE_URL is REQUIRED and should point to your Neon instance
    - Legacy POSTGRES_* environment variables are no longer used
    - All database operations use the remote Neon database via DATABASE_URL
    """
    
    # Database Configuration - REQUIRED
    # Must be a valid PostgreSQL connection string pointing to Neon
    # Example: postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/dbname?sslmode=require
    DATABASE_URL: str
    
    # Authentication & Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application Settings
    APP_NAME: str = "Chat Application"
    DEBUG: bool = True
    BACKEND_URL: str = "http://localhost:8000"
    
    # Optional AI Features
    OPENAI_API_KEY: str = ""  # Optional - only needed if using OpenAI features

    class Config:
        env_file = ".env"


settings = Settings()