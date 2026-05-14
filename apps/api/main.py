from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import posts, trends, analytics

app = FastAPI(
    title="LuminaSocial Ultra API",
    version="0.1.0",
    description="Autonomous social media factory with closed-loop feedback",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router, prefix="/posts", tags=["posts"])
app.include_router(trends.router, prefix="/trends", tags=["trends"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.get("/health")
async def health():
    return {"status": "ok"}
