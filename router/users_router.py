from fastapi import APIRouter, Depends
from db.database import get_db
from schemas.user_schema import UserResponse, UserUpdate
from dependencies import get_current_user
from models.user import User
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.dict(exclude_unset=True)

    # Update the fields
    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


async def update_user_in_db(user_id: int, data: dict):
    user = await User.get(id=user_id)
    for key, value in data.items():
        setattr(user, key, value)
    await user.save()
    return user
