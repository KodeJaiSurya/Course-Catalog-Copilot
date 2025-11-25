"""
Database Configuration Module

MIGRATION TO NEON POSTGRES - IMPORTANT NOTES:
==============================================
This project has been standardized to use Neon Postgres as the single database source.

Key Changes:
- All database connections now use DATABASE_URL from config/settings
- DATABASE_URL must point to the remote Neon Postgres instance
- Legacy local Postgres configuration (POSTGRES_USER, POSTGRES_PASSWORD, etc.) has been removed
- No fallback to local Docker/localhost Postgres - Neon is the single source of truth
- All teammates share the same DATABASE_URL via .env file

Connection String Format:
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

Benefits:
- No local Postgres installation required
- No Docker setup needed
- Consistent database state across all developers
- pgvector extension enabled on Neon
- Automatic backups and scaling via Neon
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from config import settings

# Base class for SQLAlchemy models
Base = declarative_base()

# Create database engine using Neon DATABASE_URL from settings
# This is the single source of truth for database connectivity
DATABASE_URL = settings.DATABASE_URL

print(f"🔗 Connecting to Neon Postgres...")
print(f"📊 Database host: {DATABASE_URL.split('@')[1].split('/')[0] if '@' in DATABASE_URL else 'unknown'}")

# SQLAlchemy engine setup
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,         # Connection pool size
    max_overflow=10      # Max overflow connections
)

# Session factory for database operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Database session dependency for FastAPI routes.
    
    Yields a database session and ensures proper cleanup after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
