"""
Embedding Service - Generate embeddings for text
Supports multiple embedding providers
"""
from typing import List
import numpy as np


# ========== OPTION 1: OpenAI Embeddings (Recommended) ==========
"""
Uncomment this section to use OpenAI embeddings

import openai
from app.config import settings

openai.api_key = settings.OPENAI_API_KEY

def generate_embedding(text: str) -> List[float]:
    response = openai.Embedding.create(
        input=text,
        model="text-embedding-ada-002"
    )
    return response['data'][0]['embedding']
"""


# ========== OPTION 2: Sentence Transformers (Free, Local) ==========
"""
Uncomment this section to use local Sentence Transformers
"""

from sentence_transformers import SentenceTransformer

# Load model once at startup
model = SentenceTransformer(
    'sentence-transformers/all-mpnet-base-v2')  # 384 dimensions
# OR use: 'sentence-transformers/all-mpnet-base-v2'  # 768 dimensions

def generate_embedding(text: str) -> List[float]:
    embedding = model.encode(text)
    return embedding.tolist()


# ========== OPTION 3: Mock Embeddings (For Testing) ==========
# def generate_embedding(text: str) -> List[float]:
#     """
#     Mock embedding generator for testing
#     Replace this with actual embedding service
#     """
#     # Generate deterministic "embedding" based on text hash
#     np.random.seed(hash(text) % (2**32))
#     embedding = np.random.rand(1536).tolist()
#     return embedding


def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts"""
    return [generate_embedding(text) for text in texts]


def prepare_professor_text(prof_data: dict) -> str:
    """
    Prepare professor data for embedding
    Combines relevant fields into searchable text
    """
    name = prof_data.get('name', '')
    # department = prof_data.get('department', '')
    # rating = prof_data.get('rating', '')

    # Summarize reviews
    # reviews = prof_data.get('reviews', [])
    # review_texts = []
    # for review in reviews[:5]:  # Top 5 reviews
    #     comment = review.get('comment', '')
    #     if comment:
    #         review_texts.append(comment)

    # reviews_summary = ' '.join(review_texts)

    # Combine all text
    text = f"""
    Professor: {name}
    """
    # Department: {department}
    # Rating: {rating}/5
    # Student Reviews: {reviews_summary}

    return text.strip()


def prepare_course_text(course_data: dict) -> str:
    """
    Prepare course data for embedding
    Combines course code, title, and description
    """
    title = course_data.get('title', '')
    # description = course_data.get('description', '')

    # Extract course code from title (e.g., "ACCT 1201")
    course_code = title.split('.')[0] if '.' in title else title.split()[0]

    text = f"""
    Course: {title}
    Code: {course_code}
    """
    # Description: {description}

    return text.strip()
