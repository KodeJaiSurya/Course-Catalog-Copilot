from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from router import auth_router, users_router, chat_router, rag_router
from models.rag import Course
from db.database import SessionLocal
from utils.helper import clean_course_title

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(chat_router.router)
app.include_router(rag_router.router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Chat Application API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.on_event("startup")
def load_courses():
    db = SessionLocal()
    try:
        courses = db.query(Course).all()
        app.state.items = courses
        app.state.cleaned_titles = [
            clean_course_title(c.title) for c in courses]
        print(f"Loaded {len(courses)} courses into memory")
    finally:
        db.close()

@app.get("/cleaned_titles")
def get_cleaned_titles():
    return app.state.cleaned_titles

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
