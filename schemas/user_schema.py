from typing import List
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str
    degree: str 
    course: str 
    courses_taken: Optional[List[str]] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    area_of_study: Optional[str] = None
    courses_taken: Optional[List[str]] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


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
