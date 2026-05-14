from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from db.connection import get_db
from config import get_settings

router = APIRouter()


class PostCreate(BaseModel):
    title: str
    raw_prompt: str
    platform_target: str = "instagram"
    trend_id: Optional[str] = None
    caption_draft: Optional[str] = None


class PostApprove(BaseModel):
    approved_by: str
    scheduled_at: Optional[str] = None


class GenerateRequest(BaseModel):
    # Path to source video, relative to storage/assets/ or absolute within storage.
    asset_path: str
    # Override caption; falls back to post.caption_draft if omitted.
    caption: Optional[str] = None


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
            INSERT INTO posts (title, raw_prompt, platform_target, trend_id,
                               caption_draft, status)
            VALUES (:title, :raw_prompt, :platform_target::platform_target,
                    :trend_id::uuid, :caption_draft, 'Draft')
            RETURNING *
        """),
        body.model_dump(),
    )
    await db.commit()
    return dict(result.fetchone()._mapping)


@router.post("/{post_id}/generate")
async def generate_post_variants(
    post_id: str,
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 2 entry point.

    1. Validates the source asset path is within the storage directory.
    2. Runs the A/B video factory (FFmpeg, parallel exports).
    3. Auto-runs the brand guardrail on the caption.
    4. Persists variant paths, durations, brand score, and advances status:
         Draft → Pending  (guardrail passed)
         Draft → Draft    (guardrail failed; notes explain why)
    """
    # Fetch post
    result = await db.execute(
        text("SELECT * FROM posts WHERE id = :id"),
        {"id": post_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    post = dict(row._mapping)

    if post["status"] not in ("Draft",):
        raise HTTPException(
            status_code=409,
            detail=f"Post is '{post['status']}' — only Draft posts can be (re)generated",
        )

    # Resolve and validate asset path
    cfg = get_settings()
    storage_root = Path(cfg.storage_base_path).resolve()
    raw_path = body.asset_path

    # Allow relative paths anchored to storage/assets/
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = storage_root / "assets" / candidate

    asset_path = candidate.resolve()

    # Path traversal guard
    if not str(asset_path).startswith(str(storage_root)):
        raise HTTPException(
            status_code=400,
            detail="asset_path must be within the storage directory",
        )
    if not asset_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Asset not found: {asset_path}",
        )

    caption = body.caption or post.get("caption_draft") or post["raw_prompt"]

    # ── Phase 2a: generate A/B variants ──────────────────────────────
    from modules.video.factory import generate_ab_variants
    try:
        variants = await generate_ab_variants(
            asset_path=str(asset_path),
            caption=caption,
            post_id=post_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # ── Phase 2b: brand guardrail ─────────────────────────────────────
    from modules.guardrail.brand_check import check_brand_alignment
    try:
        guardrail = await check_brand_alignment(
            caption=caption,
            visual_style=f"Variant A: fast/aggressive | Variant B: cinematic/minimal",
            platform=post["platform_target"],
        )
        brand_score = guardrail.score
        guardrail_passed = guardrail.passed
        guardrail_notes = guardrail.notes
        new_status = "Pending" if guardrail.passed else "Draft"
    except Exception as exc:
        # Guardrail failure must not block video generation
        brand_score = None
        guardrail_passed = None
        guardrail_notes = f"Guardrail check errored: {exc}"
        new_status = "Draft"

    # ── Persist everything ────────────────────────────────────────────
    updated = await db.execute(
        text("""
            UPDATE posts SET
                variant_a_path             = :variant_a_path,
                variant_b_path             = :variant_b_path,
                variant_a_duration_sec     = :variant_a_duration_sec,
                variant_b_duration_sec     = :variant_b_duration_sec,
                caption_draft              = :caption,
                brand_alignment_score      = :brand_score,
                guardrail_passed           = :guardrail_passed,
                guardrail_notes            = :guardrail_notes,
                guardrail_checked_at       = NOW(),
                status                     = :new_status::post_status
            WHERE id = :post_id
            RETURNING *
        """),
        {
            "post_id": post_id,
            "variant_a_path": variants.variant_a_path,
            "variant_b_path": variants.variant_b_path,
            "variant_a_duration_sec": variants.variant_a_duration_sec,
            "variant_b_duration_sec": variants.variant_b_duration_sec,
            "caption": caption,
            "brand_score": brand_score,
            "guardrail_passed": guardrail_passed,
            "guardrail_notes": guardrail_notes,
            "new_status": new_status,
        },
    )
    await db.commit()
    return dict(updated.fetchone()._mapping)


@router.post("/{post_id}/recheck")
async def recheck_post_brand(post_id: str, db: AsyncSession = Depends(get_db)):
    """
    Re-runs the brand guardrail on the existing caption of a post without
    regenerating video variants.

    Updates brand_alignment_score, guardrail_passed, guardrail_notes, and
    guardrail_checked_at. If the score passes AND the post is still in Draft
    AND variant_a_path is already set, advances status to Pending.
    """
    result = await db.execute(
        text("SELECT * FROM posts WHERE id = :id"),
        {"id": post_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    post = dict(row._mapping)

    caption = post.get("caption_draft") or post.get("raw_prompt") or ""

    from modules.guardrail.brand_check import check_brand_alignment
    guardrail = await check_brand_alignment(
        caption=caption,
        visual_style="Variant A: fast/aggressive | Variant B: cinematic/minimal",
        platform=post["platform_target"],
    )

    new_status = post["status"]
    if (
        guardrail.passed
        and post["status"] == "Draft"
        and post.get("variant_a_path") is not None
    ):
        new_status = "Pending"

    updated = await db.execute(
        text("""
            UPDATE posts SET
                brand_alignment_score  = :brand_score,
                guardrail_passed       = :guardrail_passed,
                guardrail_notes        = :guardrail_notes,
                guardrail_checked_at   = NOW(),
                status                 = :new_status::post_status
            WHERE id = :post_id
            RETURNING *
        """),
        {
            "post_id": post_id,
            "brand_score": guardrail.score,
            "guardrail_passed": guardrail.passed,
            "guardrail_notes": guardrail.notes,
            "new_status": new_status,
        },
    )
    await db.commit()
    return dict(updated.fetchone()._mapping)


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
