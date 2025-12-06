from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import datetime
from passlib.context import CryptContext
import uuid
from sqlalchemy.dialects.postgresql import UUID

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Base):
    """User model"""
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False
    )
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        server_default=func.now(),
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=func.now(),
        nullable=False
    )

    degree = Column(String, nullable=True)
    course = Column(String, nullable=True)

    # Correct way to define VARCHAR[]
    courses_taken = Column(ARRAY(String), nullable=True)
        
    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    # Relationships
    conversations = relationship(
        "ChatConversation", back_populates="user", cascade="all, delete-orphan")
