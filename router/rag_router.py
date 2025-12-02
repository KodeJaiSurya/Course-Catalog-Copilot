from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import json
import os
from db.database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.rag_schema import (
    ProfessorCreate,
    ProfessorResponse,
    CourseCreate,
    CourseResponse,
    QueryRequest,
    QueryResponse
)
from services.rag_service import (
    ingest_professor,
    ingest_professors_batch,
    ingest_course,
    ingest_courses_batch,
    search_professors,
    search_courses,
    search_both,
    get_all_professors,
    get_all_courses
)

router = APIRouter(prefix="/rag", tags=["RAG"])


# ========== INGESTION ENDPOINTS ==========

@router.post("/professors/ingest", response_model=ProfessorResponse)
def ingest_single_professor(
    professor_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest a single professor"""
    professor = ingest_professor(professor_data, db)
    return professor


@router.post("/professors/ingest-batch")
def ingest_multiple_professors(
    professors_data: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest multiple professors"""
    professors = ingest_professors_batch(professors_data, db)
    return {
        "message": f"Successfully ingested {len(professors)} professors",
        "count": len(professors)
    }


@router.post("/professors/upload-json")
async def upload_professors_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload professors from JSON file"""
    content = await file.read()
    professors_data = json.loads(content)

    if not isinstance(professors_data, list):
        professors_data = [professors_data]

    professors = ingest_professors_batch(professors_data, db)

    return {
        "message": f"Successfully ingested {len(professors)} professors from file",
        "count": len(professors)
    }


@router.post("/courses/ingest", response_model=CourseResponse)
def ingest_single_course(
    course_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest a single course"""
    course = ingest_course(course_data, db)
    return course


@router.post("/courses/ingest-batch")
def ingest_multiple_courses(
    courses_data: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest multiple courses"""
    courses = ingest_courses_batch(courses_data, db)
    return {
        "message": f"Successfully ingested {len(courses)} courses",
        "count": len(courses)
    }


@router.post("/courses/upload-json")
async def upload_courses_json(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload courses from JSON file"""
    content = await file.read()
    courses_data = json.loads(content)

    if not isinstance(courses_data, list):
        courses_data = [courses_data]

    courses = ingest_courses_batch(courses_data, db)

    return {
        "message": f"Successfully ingested {len(courses)} courses from file",
        "count": len(courses)
    }


# ========== SEARCH ENDPOINTS ==========

@router.post("/search/professors", response_model=QueryResponse)
def search_professors_endpoint(
    query_data: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for professors using semantic search"""
    results = search_professors(query_data.query, query_data.limit, db)

    return QueryResponse(
        query=query_data.query,
        results=results
    )


@router.post("/search/courses", response_model=QueryResponse)
def search_courses_endpoint(
    query_data: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search for courses using semantic search"""
    results = search_courses(query_data.query, query_data.limit, db)

    return QueryResponse(
        query=query_data.query,
        results=results
    )


@router.post("/search", response_model=QueryResponse)
def search_all_endpoint(
    query_data: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Smart search - automatically searches professors or courses based on query
    """
    results = search_both(query_data.query, query_data.limit, db)

    return QueryResponse(
        query=query_data.query,
        results=results
    )


# ========== LIST ENDPOINTS ==========

@router.get("/professors", response_model=List[ProfessorResponse])
def list_all_professors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all professors"""
    professors = get_all_professors(db)
    return professors


@router.get("/courses", response_model=List[CourseResponse])
def list_all_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all courses"""
    courses = get_all_courses(db)
    return courses


# ========== STATISTICS ENDPOINT ==========

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get database statistics"""
    from models.rag import Professor, Course

    professor_count = db.query(Professor).count()
    course_count = db.query(Course).count()

    return {
        "professors": professor_count,
        "courses": course_count,
        "total": professor_count + course_count
    }


@router.post("/ingest-from-files")
def ingest_from_local_files(
    professors_file: str = "data/professors.json",
    courses_file: str = "data/courses.json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingest data from local JSON files
    
    Args:
        professors_file: Path to professors JSON file
        courses_file: Path to courses JSON file
    """
    import json

    results = {
        "professors": {"success": False, "count": 0, "error": None},
        "courses": {"success": False, "count": 0, "error": None}
    }

    # Ingest professors
    try:
        if os.path.exists(professors_file):

            try:
                # First attempt: try to load as normal JSON
                with open(professors_file, 'r', encoding='utf-8') as f:
                    prof_data = json.load(f)

                # If the result is a dict, convert to list
                if isinstance(prof_data, dict):
                    prof_data = [prof_data]

            except json.JSONDecodeError:
                # Fallback: NDJSON or multiple JSON objects
                prof_data = []
                with open(professors_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            prof_data.append(json.loads(line))

            # Process the batch
            professors = ingest_professors_batch(prof_data, db)
            results["professors"]["success"] = True
            results["professors"]["count"] = len(professors)

        else:
            results["professors"]["error"] = f"File not found: {professors_file}"


    except Exception as e:
        results["professors"]["error"] = str(e)


    # Ingest courses
    try:
        if os.path.exists(courses_file):
            with open(courses_file, 'r', encoding='utf-8') as f:
                course_data = json.load(f)

            # Courses should be a list
            if isinstance(course_data, dict):
                course_data = [course_data]

            courses = ingest_courses_batch(course_data, db)
            results["courses"]["success"] = True
            results["courses"]["count"] = len(courses)
        else:
            results["courses"]["error"] = f"File not found: {courses_file}"
    except Exception as e:
        results["courses"]["error"] = str(e)

    return {
        "message": "Ingestion completed",
        "results": results,
        "total_ingested": results["professors"]["count"] + results["courses"]["count"]
    }


@router.post("/ingest-from-directory")
def ingest_from_directory(
    directory: str = "data",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingest all JSON files from a directory
    Auto-detects professors and courses based on content
    """
    import json
    from pathlib import Path

    if not os.path.exists(directory):
        raise HTTPException(
            status_code=404, detail=f"Directory not found: {directory}")

    results = {
        "files_processed": 0,
        "professors_ingested": 0,
        "courses_ingested": 0,
        "errors": []
    }

    # Find all JSON files
    json_files = list(Path(directory).glob("*.json"))

    for json_file in json_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            results["files_processed"] += 1

            # Convert single object to list
            if isinstance(data, dict):
                data = [data]

            if not isinstance(data, list):
                results["errors"].append(f"{json_file.name}: Invalid format")
                continue

            # Auto-detect type based on first object
            if len(data) > 0:
                first_item = data[0]

                # Check if it's a professor (has 'rating' or 'reviews' or 'department')
                if 'rating' in first_item or 'reviews' in first_item:
                    professors = ingest_professors_batch(data, db)
                    results["professors_ingested"] += len(professors)

                # Check if it's a course (has 'description' or title with course code pattern)
                elif 'description' in first_item or ('title' in first_item and '.' in first_item['title']):
                    courses = ingest_courses_batch(data, db)
                    results["courses_ingested"] += len(courses)

                else:
                    results["errors"].append(
                        f"{json_file.name}: Could not determine type")

        except Exception as e:
            results["errors"].append(f"{json_file.name}: {str(e)}")

    return {
        "message": "Directory ingestion completed",
        "summary": results
    }
