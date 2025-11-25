"""
Embedding Service - Generate embeddings using HuggingFace transformers
"""
from typing import List
from sentence_transformers import SentenceTransformer

# Load the embedding model once (reuse across requests)
# Using a smaller, faster model that produces 768-dimensional embeddings
model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for a given text using sentence-transformers
    
    Args:
        text: Input text to embed
        
    Returns:
        List of floats representing the embedding vector (768 dimensions)
    """
    if not text or not text.strip():
        # Return zero vector for empty text
        return [0.0] * 768
    
    # Generate embedding
    embedding = model.encode(text, convert_to_numpy=True)
    
    # Convert to list and return
    return embedding.tolist()


def prepare_professor_text(prof_data: dict) -> str:
    """
    Prepare professor data for embedding by combining relevant fields
    
    Args:
        prof_data: Dictionary containing professor information
        
    Returns:
        Combined text string for embedding
    """
    parts = []
    
    # Add name
    if 'name' in prof_data and prof_data['name']:
        parts.append(f"Professor: {prof_data['name']}")
    
    # Add department
    if 'department' in prof_data and prof_data['department']:
        parts.append(f"Department: {prof_data['department']}")
    
    # Add rating
    if 'rating' in prof_data and prof_data['rating']:
        parts.append(f"Rating: {prof_data['rating']}")
    
    # Add reviews summary (if available)
    if 'reviews' in prof_data and isinstance(prof_data['reviews'], list):
        # Take first few reviews
        reviews_text = " ".join([
            review.get('comment', '') 
            for review in prof_data['reviews'][:3] 
            if review.get('comment')
        ])
        if reviews_text:
            parts.append(f"Reviews: {reviews_text}")
    
    return " | ".join(parts)


def prepare_course_text(course_data: dict) -> str:
    """
    Prepare course data for embedding by combining relevant fields
    
    Args:
        course_data: Dictionary containing course information
        
    Returns:
        Combined text string for embedding
    """
    parts = []
    
    # Add title (usually contains course code)
    if 'title' in course_data and course_data['title']:
        parts.append(course_data['title'])
    
    # Add description
    if 'description' in course_data and course_data['description']:
        # Limit description length to avoid overly long embeddings
        description = course_data['description']
        if len(description) > 500:
            description = description[:500] + "..."
        parts.append(description)
    
    # Add credit hours if available
    if 'credit_hours' in course_data and course_data['credit_hours']:
        parts.append(f"Credits: {course_data['credit_hours']}")
    
    # Add any additional metadata
    if 'level' in course_data and course_data['level']:
        parts.append(f"Level: {course_data['level']}")
    
    return " | ".join(parts)


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for multiple texts at once (more efficient)
    
    Args:
        texts: List of text strings to embed
        
    Returns:
        List of embedding vectors
    """
    if not texts:
        return []
    
    # Filter out empty texts
    valid_texts = [text if text and text.strip() else " " for text in texts]
    
    # Generate embeddings in batch
    embeddings = model.encode(valid_texts, convert_to_numpy=True)
    
    # Convert to list of lists
    return [emb.tolist() for emb in embeddings]

