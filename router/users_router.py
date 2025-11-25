from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from schemas.user_schema import UserResponse, OnboardingData
from dependencies import get_current_user
from models.user import User
from db.database import get_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/onboarding", response_model=UserResponse)
async def complete_onboarding(
    onboarding_data: OnboardingData,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete academic onboarding for user"""
    current_user.education_level = onboarding_data.education_level
    current_user.major = onboarding_data.major
    current_user.completed_courses = onboarding_data.completed_courses
    current_user.onboarding_completed = True
    
    db.commit()
    db.refresh(current_user)
    
    return current_user
