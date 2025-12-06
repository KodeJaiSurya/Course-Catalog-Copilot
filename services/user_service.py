from sqlalchemy.orm import Session
from models.user import User
from models.chat import ChatConversation
from functools import lru_cache


def get_user_by_email(email: str, db: Session):
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(user_id: int, db: Session):
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_courses_taken_by_conversation(conversation_id: str, db: Session):
    """
    Get the courses_taken list for the user who owns the given conversation_id.
    """

    # Step 1: Get conversation
    conversation = (
        db.query(ChatConversation)
        .filter(ChatConversation.id == conversation_id)
        .first()
    )

    if not conversation:
        return None

    user_id = conversation.user_id
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        return [] 
    return user.courses_taken or []


def update_user(user_id: int, update_data: dict, db: Session):
    """Update user information"""
    user = get_user_by_id(user_id, db)

    if not user:
        return None

    for key, value in update_data.items():
        if hasattr(user, key):
            setattr(user, key, value)

    db.commit()
    db.refresh(user)

    return user


def delete_user(user_id: int, db: Session):
    """Delete a user"""
    user = get_user_by_id(user_id, db)

    if not user:
        return False

    db.delete(user)
    db.commit()

    return True
