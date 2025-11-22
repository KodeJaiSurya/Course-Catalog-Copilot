from sqlalchemy import Column, DateTime, String, Text, Float, JSON
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from db.database import Base
import uuid
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID


class Professor(Base):
    """Professor information with embeddings"""
    __tablename__ = "professors"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    name = Column(String, index=True, nullable=False)
    department = Column(String, index=True)
    rating = Column(Float)
    url = Column(String)

    # Store full professor data as JSON
    full_data = Column(JSON)

    # Combined text for embedding (name + department + reviews summary)
    search_text = Column(Text)

    # Vector embedding for semantic search
    embedding = Column(Vector(768))  # OpenAI ada-002 dimension

    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow,
                        server_default=func.now(), nullable=False)


class Course(Base):
    """Course information with embeddings"""
    __tablename__ = "courses"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    course_code = Column(String, index=True, nullable=False, unique=True)
    title = Column(String, nullable=False)
    description = Column(Text)

    # Store full course data as JSON
    full_data = Column(JSON)

    # Combined text for embedding (code + title + description)
    search_text = Column(Text)

    # Vector embedding for semantic search
    embedding = Column(Vector(768))  # OpenAI ada-002 dimension

    # Metadata
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow,
                        server_default=func.now(), nullable=False)
