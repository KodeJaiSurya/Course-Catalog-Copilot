from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from db.database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.chat_schema import (
    ConversationCreate,
    ConversationResponse,
    ConversationWithMessages,
    MessageCreate,
    MessageResponse
)
from uuid import UUID
from services.chat_service import (
    create_conversation,
    get_user_conversations,
    get_conversation_by_id,
    send_message,
    delete_conversation,
    update_conversation_title
)

router = APIRouter(prefix="/conversations", tags=["Chat"])


@router.post("", response_model=ConversationResponse)
def create_new_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new chat conversation"""
    return create_conversation(current_user.id, conversation_data, db)


@router.get("", response_model=List[ConversationResponse])
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for current user"""
    return get_user_conversations(current_user.id, db)


@router.get("/{conversation_id}", response_model=ConversationWithMessages)
def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific conversation with all messages"""
    return get_conversation_by_id(conversation_id, current_user.id, db)


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def create_message(
    conversation_id: UUID,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message and get AI response"""
    return send_message(conversation_id, current_user.id, message_data, db)


@router.delete("/{conversation_id}")
def remove_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation"""
    delete_conversation(conversation_id, current_user.id, db)
    return {"message": "Conversation deleted successfully"}


@router.put("/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: UUID,
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation title"""
    return update_conversation_title(
        conversation_id,
        current_user.id,
        conversation_data.title,
        db
    )
