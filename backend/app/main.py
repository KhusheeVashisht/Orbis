from fastapi import FastAPI

from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time AI Voice Translation & Zero-Shot Voice Cloning",
    version=settings.VERSION
)


@app.get("/")
async def root():
    return {
        "project": settings.APP_NAME,
        "status": "running",
        "message": "Your Voice, Without Borders"
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "orbis-backend"
    }