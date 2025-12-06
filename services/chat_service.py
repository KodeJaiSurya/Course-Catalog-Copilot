"""
Updated chat service to use LangGraph agent
"""
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from fastapi import HTTPException, status
from models.chat import ChatConversation, ChatMessage
from schemas.chat_schema import ConversationCreate, MessageCreate
from services.langgraph_agent import run_agent_with_history


def create_conversation(user_id: int, conversation_data: ConversationCreate, db: Session):
    """Create a new conversation"""
    conversation = ChatConversation(
        user_id=user_id,
        title=conversation_data.title
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


def get_user_conversations(user_id: int, db: Session):
    """Get all conversations for a user"""
    conversations = db.query(ChatConversation)\
        .filter(ChatConversation.user_id == user_id)\
        .order_by(ChatConversation.updated_at.desc())\
        .all()

    return conversations


def get_conversation_by_id(conversation_id: int, user_id: int, db: Session):
    """Get a specific conversation with messages"""
    conversation = db.query(ChatConversation)\
        .filter(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id
    )\
        .first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


def send_message(conversation_id: int, user_id: int, message_data: MessageCreate, db: Session):
    """
    Send a message and generate AI response using LangGraph agent
    """
    # Verify conversation belongs to user
    conversation = get_conversation_by_id(conversation_id, user_id, db)

    # Create user message
    user_message = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=message_data.content
    )
    db.add(user_message)
    db.flush()  # Flush to get the message in the conversation

    # Get conversation history
    messages = db.query(ChatMessage)\
        .filter(ChatMessage.conversation_id == conversation_id)\
        .order_by(ChatMessage.created_at)\
        .all()

    # Convert to format expected by agent
    message_history = [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]

    # Generate AI response using LangGraph agent
    try:
        ai_response_text = run_agent_with_history(message_history, db, conversation_id)
    except Exception as e:
        # Fallback to simple response if agent fails
        ai_response_text = f"I apologize, but I encountered an error processing your request: {str(e)}"

    # Create assistant message
    assistant_message = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response_text
    )
    db.add(assistant_message)

    # Update conversation timestamp and title if needed
    conversation.updated_at = func.now()
    if conversation.title == "New Chat":
        conversation.title = message_data.content[:30] + \
            ("..." if len(message_data.content) > 30 else "")

    db.commit()
    db.refresh(assistant_message)

    return assistant_message


def delete_conversation(conversation_id: int, user_id: int, db: Session):
    """Delete a conversation"""
    conversation = db.query(ChatConversation)\
        .filter(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id
    )\
        .first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    db.delete(conversation)
    db.commit()

    return True


def update_conversation_title(conversation_id: int, user_id: int, new_title: str, db: Session):
    """Update conversation title"""
    conversation = get_conversation_by_id(conversation_id, user_id, db)

    conversation.title = new_title
    db.commit()
    db.refresh(conversation)

    return conversation
