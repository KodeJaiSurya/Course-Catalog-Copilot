from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID


class ProfessorCreate(BaseModel):
    """Schema for creating a professor"""
    name: str
    department: Optional[str] = None
    rating: Optional[float] = None
    url: Optional[str] = None
    full_data: Dict[str, Any]


class ProfessorResponse(BaseModel):
    """Schema for professor response"""
    id: UUID
    name: str
    department: Optional[str]
    rating: Optional[float]
    url: Optional[str]
    full_data: Dict[str, Any]

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    """Schema for creating a course"""
    course_code: str
    title: str
    description: str
    full_data: Dict[str, Any]


class CourseResponse(BaseModel):
    """Schema for course response"""
    id: UUID
    course_code: str
    title: str
    description: str
    full_data: Dict[str, Any]

    class Config:
        from_attributes = True


class QueryRequest(BaseModel):
    """Schema for search query"""
    query: str
    limit: Optional[int] = 5


class SearchResult(BaseModel):
    """Schema for search result"""
    type: str  # "professor" or "course"
    data: Dict[str, Any]
    similarity: float


class QueryResponse(BaseModel):
    """Schema for query response"""
    query: str
    results: List[SearchResult]
    answer: Optional[str] = None
