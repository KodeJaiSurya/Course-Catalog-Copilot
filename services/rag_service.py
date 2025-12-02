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
from utils.browser_search import duckduckgo_search, fetch_webpage_content


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


def search_professors(query: str):
    """
    Comprehensive web search fallback
    
    Args:
        query: Search query
        search_type: "professor"
    
    Returns:
        Search results with summaries
    """
    results = {
        "query": query,
        "sources": [],
        "summary": ""
    }

    try:
        enhanced_query = f"{query} site:ratemyprofessors.com"

        # # Try DuckDuckGo first (more reliable)
        search_results = duckduckgo_search(enhanced_query, max_results=5)

        # Process results
        for result in search_results[:2]:  # Top 3 results
            source = {
                "title": result['title'],
                "link": result['link'],
                "snippet": result['snippet']
            }

            if result['link']:
                content = fetch_webpage_content(result['link'])
                source['content'] = content 

            results["sources"].append(source)

        # Create summary from snippets
        if results["sources"]:
            snippets = [s['content']
                        for s in results["sources"] if s['content']]
            results["summary"] = " ".join(
                snippets[:2])  

    except Exception as e:
        print(f"Web fallback search error: {e}")
        results["error"] = str(e)

    return results


def search_courses(query: str):
    """
    Comprehensive web search using two targeted query variations.
    
    Args:
        query: Search query
    
    Returns:
        Search results with combined sources and unified summary
    """
    results = {
        "query": query,
        "sources": [],
        "summary": ""
    }

    try:
        # Two enhanced search variations
        enhanced_query1 = f"{query} bnrordsp.neu.edu"
        enhanced_query2 = f"{query} Search Neu"
        all_results = []
        for enhanced_query in [enhanced_query1, enhanced_query2]:
            search_results = duckduckgo_search(enhanced_query, max_results=2)
            all_results.extend(search_results)

        # Remove duplicates (based on link)
        unique_links = set()
        unique_results = []
        for result in all_results:
            if result['link'] not in unique_links:
                unique_links.add(result['link'])
                unique_results.append(result)
        
        for result in unique_results[:4]:
            source = {
                "title": result.get('title', ''),
                "link": result.get('link', ''),
                "snippet": result.get('snippet', '')
            }
            if result.get('link'):
                content = fetch_webpage_content(result['link'])
                source['content'] = content
            results["sources"].append(source)

        # Create a combined summary using top snippets
        if results["sources"]:
            snippets = [s.get('content', '') for s in results["sources"] if s.get('content')]
            results["summary"] = " ".join(
                snippets[:4])  # Combine up to 3 snippets

    except Exception as e:
        print(f"Web fallback search error: {e}")
        results["error"] = str(e)
    return results

def search_both(query: str):
    """
    Comprehensive web search fallback

    Args:
        query: Search query
        search_type: "both"

    Returns:
        Search results with summaries
    """
    results = {
        "query": query,
        "sources": [],
        "summary": ""
    }

    try:
        enhanced_query = f"{query} Search Neu"
        search_results = duckduckgo_search(enhanced_query, max_results=5)
        # Process results
        for result in search_results[:2]:  # Top 3 results
            source = {
                "title": result['title'],
                "link": result['link'],
                "snippet": result['snippet']
            }

            if result['link']:
                content = fetch_webpage_content(result['link'])
                source['content'] = content 
            results["sources"].append(source)
        # Create summary from snippets
        if results["sources"]:
            snippets = [s['snippet']
                        for s in results["sources"] if s['snippet']]
            results["summary"] = " ".join(
                snippets[:2])  # Combine first 2 snippets

    except Exception as e:
        print(f"Web fallback search error: {e}")
        results["error"] = str(e)
    return results

# ========== RETRIEVAL FUNCTIONS ==========


def suggest_courses(query: str, limit: int, db: Session) -> List[SearchResult]:
    """
    Suggest courses using semantic similarity
    """
    query_embedding = generate_embedding(query)

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
        relevant = is_title_relevant_to_query(query, title)  
        if relevant:  
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
