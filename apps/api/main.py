from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routers import posts, trends, analytics

app = FastAPI(
    title="LuminaSocial Ultra API",
    version="0.1.0",
    description="Autonomous social media factory with closed-loop feedback",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev mode — lock down per-origin in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router, prefix="/posts", tags=["posts"])
app.include_router(trends.router, prefix="/trends", tags=["trends"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

# Serve generated video files so the dashboard can embed them
cfg = get_settings()
app.mount("/storage", StaticFiles(directory=cfg.storage_base_path), name="storage")


@app.get("/health")
async def health():
    return {"status": "ok"}
