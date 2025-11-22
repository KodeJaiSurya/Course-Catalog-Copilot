"""
RAG Service - Handle professor and course data ingestion and retrieval
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any
from models.rag import Professor, Course
from langchain_openai import ChatOpenAI
from config import settings
from langchain_core.messages import HumanMessage
from schemas.rag_schema import ProfessorCreate, CourseCreate, SearchResult
from services.embedding_service import (
    generate_embedding,
    prepare_professor_text,
    prepare_course_text
)


# ========== INGESTION FUNCTIONS ==========

def ingest_professor(prof_data: dict, db: Session) -> Professor:
    """
    Ingest professor data into database with embedding
    """
    # Prepare text for embedding
    search_text = prepare_professor_text(prof_data)

    # Generate embedding
    embedding = generate_embedding(search_text)

    # Extract key fields
    name = prof_data.get('name', '')
    department = prof_data.get('department', '')
    rating_str = prof_data.get('rating', '0')

    # Convert rating to float
    try:
        rating = float(rating_str) if rating_str else None
    except (ValueError, TypeError):
        rating = None

    # Create professor record
    professor = Professor(
        name=name,
        department=department,
        rating=rating,
        url=prof_data.get('url', ''),
        full_data=prof_data,
        search_text=search_text,
        embedding=embedding
    )

    db.add(professor)
    db.commit()
    db.refresh(professor)

    return professor


def ingest_professors_batch(professors_data: List[dict], db: Session) -> List[Professor]:
    """Ingest multiple professors"""
    professors = []
    for prof_data in professors_data:
        try:
            prof = ingest_professor(prof_data, db)
            professors.append(prof)
        except Exception as e:
            print(f"Error ingesting professor {prof_data.get('name')}: {e}")
            continue

    return professors


def ingest_course(course_data: dict, db: Session) -> Course:
    """
    Ingest course data into database with embedding
    """
    # Prepare text for embedding
    search_text = prepare_course_text(course_data)

    # Generate embedding
    embedding = generate_embedding(search_text)

    # Extract course code from title
    title = course_data.get('title', '')
    course_code = title.split('.')[0].strip(
    ) if '.' in title else title.split()[0]

    description = course_data.get('description', '')

    # Create course record
    course = Course(
        course_code=course_code,
        title=title,
        description=description,
        full_data=course_data,
        search_text=search_text,
        embedding=embedding
    )

    db.add(course)
    db.commit()
    db.refresh(course)

    return course


def ingest_courses_batch(courses_data: List[dict], db: Session) -> List[Course]:
    """Ingest multiple courses"""
    courses = []
    for course_data in courses_data:
        try:
            course = ingest_course(course_data, db)
            courses.append(course)
        except Exception as e:
            print(f"Error ingesting course {course_data.get('title')}: {e}")
            continue

    return courses


# ========== RETRIEVAL FUNCTIONS ==========

def search_professors(query: str, limit: int, db: Session) -> List[SearchResult]:
    """
    Search professors using semantic similarity
    """
    # Generate embedding for query
    query_embedding = generate_embedding(query)

    # Use pgvector's cosine similarity operator
    # <=> is cosine distance, we want similarity so use 1 - distance
    sql = text("""
        SELECT 
            id, name, department, rating, url, full_data,
            1 - (embedding <=> :query_embedding) as similarity
        FROM professors
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
    """)

    results = db.execute(
        sql,
        {"query_embedding": str(query_embedding), "limit": limit}
    ).fetchall()

    search_results = []
    for row in results:
        search_results.append(SearchResult(
            type="professor",
            data={
                "id": row[0],
                "name": row[1],
                "department": row[2],
                "rating": row[3],
                "url": row[4],
                "full_data": row[5]
            },
            similarity=float(row[6])
        ))

    return search_results


def search_courses(query: str, limit: int, db: Session) -> List[SearchResult]:
    """
    Search courses using semantic similarity
    """
    # Generate embedding for query
    print("Before Query Embedding")
    query_embedding = generate_embedding(query)
    print("After Query Embedding")

    sql = text("""
        SELECT 
            id, course_code, title, description, full_data,
            1 - (embedding <=> :query_embedding) as similarity
        FROM courses
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :query_embedding
        LIMIT :limit
    """)

    results = db.execute(
        sql,
        {"query_embedding": str(query_embedding), "limit": limit}
    ).fetchall()

    

    search_results = []
    for row in results:
        title_raw = row[2] or ""
        title = title_raw.replace("\xa0", " ").strip()
        relevant = is_title_relevant_to_query(query, title)  # From your LLM check

        if relevant:  # Only add if matched
            search_results.append(SearchResult(
                type="course",
                data={
                    "id": row[0],
                    "course_code": row[1],
                    "title": title,
                    "description": row[3],
                    "full_data": row[4]
                },
                similarity=float(row[5]),
                llm_title_match=relevant
            ))

    # If no relevant matches, return empty list
    return search_results


def is_title_relevant_to_query(query: str, title: str) -> bool:
    prompt = f"""
    You are a classifier. Decide if the course title is relevant to the user's query.

    Query: "{query}"
    Course Title: "{title}"

    Respond with only 'yes' or 'no'.
    """

    llm = ChatOpenAI(
        model="gpt-4o",
        temperature=0,
        openai_api_key=settings.OPENAI_API_KEY
    )

    # Correct way to call
    response = llm.invoke([HumanMessage(content=prompt)])

    answer = response.content.strip().lower()
    return answer == "yes"


def search_all(query: str, limit: int, db: Session) -> List[SearchResult]:
    """
    Search both professors and courses, return combined results
    """
    # Classify query to determine if it's about professor or course
    query_lower = query.lower()

    # Keywords that indicate professor search
    prof_keywords = ['professor', 'prof', 'teacher',
                     'instructor', 'faculty', 'rating']

    # Keywords that indicate course search
    course_keywords = ['course', 'class', 'credit',
                       'hours', 'syllabus', 'curriculum']

    is_prof_query = any(kw in query_lower for kw in prof_keywords)
    is_course_query = any(kw in query_lower for kw in course_keywords)

    # If query is specifically about one type, search only that
    if is_prof_query and not is_course_query:
        return search_professors(query, limit, db)
    elif is_course_query and not is_prof_query:
        return search_courses(query, limit, db)

    # Otherwise, search both and combine results
    prof_results = search_professors(query, limit // 2 + 1, db)
    course_results = search_courses(query, limit // 2 + 1, db)

    # Combine and sort by similarity
    all_results = prof_results + course_results
    all_results.sort(key=lambda x: x.similarity, reverse=True)

    return all_results[:limit]


def get_professor_by_id(professor_id: int, db: Session) -> Professor:
    """Get professor by ID"""
    return db.query(Professor).filter(Professor.id == professor_id).first()


def get_course_by_id(course_id: int, db: Session) -> Course:
    """Get course by ID"""
    return db.query(Course).filter(Course.id == course_id).first()


def get_all_professors(db: Session) -> List[Professor]:
    """Get all professors"""
    return db.query(Professor).all()


def get_all_courses(db: Session) -> List[Course]:
    """Get all courses"""
    return db.query(Course).all()
