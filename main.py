from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from router import auth_router, users_router, chat_router, rag_router

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


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
