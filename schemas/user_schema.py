from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from uuid import UUID

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str


class UserResponse(UserBase):
    """Schema for user response"""
    id: UUID
    is_active: bool
    created_at: datetime
    education_level: Optional[str] = None
    major: Optional[str] = None
    completed_courses: Optional[List[str]] = None
    onboarding_completed: bool = False

    class Config:
        from_attributes = True


class OnboardingData(BaseModel):
    """Schema for academic onboarding"""
    education_level: str
    major: str
    completed_courses: List[str] = []


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for token data"""
    email: Optional[str] = None
