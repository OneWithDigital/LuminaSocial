from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.connection import get_db

router = APIRouter()


class PostCreate(BaseModel):
    title: str
    raw_prompt: str
    platform_target: str = "instagram"
    trend_id: Optional[str] = None


class PostApprove(BaseModel):
    approved_by: str
    scheduled_at: Optional[str] = None


@router.get("/")
async def list_posts(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    where_clauses = []
    params: dict = {"limit": limit, "offset": offset}

    if status:
        where_clauses.append("status = :status::post_status")
        params["status"] = status
    if platform:
        where_clauses.append("platform_target = :platform::platform_target")
        params["platform"] = platform

    where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    query = text(
        f"SELECT * FROM posts {where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
    )
    result = await db.execute(query, params)
    return [dict(row._mapping) for row in result.fetchall()]


@router.get("/{post_id}")
async def get_post(post_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM posts WHERE id = :id"),
        {"id": post_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return dict(row._mapping)


@router.post("/", status_code=201)
async def create_post(body: PostCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            INSERT INTO posts (title, raw_prompt, platform_target, trend_id, status)
            VALUES (:title, :raw_prompt, :platform_target::platform_target,
                    :trend_id::uuid, 'Draft')
            RETURNING *
        """),
        body.model_dump(),
    )
    await db.commit()
    return dict(result.fetchone()._mapping)


@router.patch("/{post_id}/approve")
async def approve_post(
    post_id: str, body: PostApprove, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            UPDATE posts
            SET status = 'Approved',
                approved_by = :approved_by,
                approved_at = NOW(),
                scheduled_at = :scheduled_at::timestamptz
            WHERE id = :post_id AND status = 'Pending'
            RETURNING *
        """),
        {"post_id": post_id, **body.model_dump()},
    )
    await db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail="Post not found or not in Pending status",
        )
    return dict(row._mapping)


@router.patch("/{post_id}/reject")
async def reject_post(post_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("""
            UPDATE posts SET status = 'Rejected'
            WHERE id = :post_id AND status IN ('Draft', 'Pending')
            RETURNING id, status
        """),
        {"post_id": post_id},
    )
    await db.commit()
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found or already final")
    return dict(row._mapping)
