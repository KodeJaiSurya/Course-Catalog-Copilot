from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user import User
from schemas.user_schema import UserCreate
from utils.security import verify_password, get_password_hash, create_access_token
from datetime import timedelta
from config import settings


def authenticate_user(email: str, password: str, db: Session):
    """Authenticate a user"""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_user(user_data: UserCreate, db: Session):
    """Create a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(
        User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        degree = user_data.degree,
        course = user_data.course,
        courses_taken = user_data.courses_taken
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


def generate_token(user: User):
    """Generate access token for user"""
    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )

    return access_token
