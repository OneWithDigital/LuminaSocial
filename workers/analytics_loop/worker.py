"""
Analytics Feedback Loop Worker
For every Published post with both A/B analytics rows, this worker:
  1. Determines the winning variant by engagement_rate
  2. Calls Claude to write a "Lessons Learned" summary
  3. Inserts into lessons_learned and marks the winning_variant on the post
"""

import asyncio
import json
import os
import logging
import re

import asyncpg
import anthropic
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [analytics_worker] %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
POLL_INTERVAL_MINUTES = int(os.getenv("ANALYTICS_POLL_INTERVAL_MINUTES", "360"))
VIRAL_THRESHOLD = int(os.getenv("VIRAL_THRESHOLD_VIEWS", "10000"))
MID_THRESHOLD = int(os.getenv("MID_THRESHOLD_VIEWS", "1000"))


async def get_unprocessed_posts(conn) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT p.id, p.platform_target,
               a_row.engagement_rate AS a_rate,
               b_row.engagement_rate AS b_rate
        FROM posts p
        JOIN LATERAL (
            SELECT engagement_rate FROM analytics
            WHERE post_id = p.id AND variant = 'A'
            ORDER BY snapshot_at DESC LIMIT 1
        ) a_row ON true
        JOIN LATERAL (
            SELECT engagement_rate FROM analytics
            WHERE post_id = p.id AND variant = 'B'
            ORDER BY snapshot_at DESC LIMIT 1
        ) b_row ON true
        WHERE p.status = 'Published'
          AND p.winning_variant IS NULL
        """
    )
    return [dict(r) for r in rows]


async def generate_lesson(post: dict) -> dict:
    if not ANTHROPIC_API_KEY:
        return {"summary": "Anthropic key not configured.", "recommended_bias": {}}

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    winner = "A" if post["a_rate"] >= post["b_rate"] else "B"
    winning_style = "fast_aggressive" if winner == "A" else "cinematic_minimal"
    delta = float(post["a_rate"]) - float(post["b_rate"])

    prompt = f"""A/B test result for post {post["id"]} on {post["platform_target"]}:
- Variant A (fast/aggressive): engagement rate = {post["a_rate"]:.4f}
- Variant B (cinematic/minimal): engagement rate = {post["b_rate"]:.4f}
- Winner: Variant {winner} ({winning_style})
- Delta: {delta:+.4f}

Write a 3-5 sentence "Lessons Learned" entry, then provide a JSON object `recommended_bias` with:
- prefer_style: "fast_aggressive" or "cinematic_minimal"
- hook_duration_sec: 3 or 5
- caption_tone: "urgent", "inspirational", "educational", or "witty"

Format:
SUMMARY: <text>
BIAS: <json>"""

    msg = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text
    summary, bias = "", {}
    if "SUMMARY:" in text and "BIAS:" in text:
        parts = text.split("BIAS:")
        summary = parts[0].replace("SUMMARY:", "").strip()
        m = re.search(r"\{.*\}", parts[1], re.DOTALL)
        if m:
            bias = json.loads(m.group())
    return {"summary": summary, "winning_style": winning_style, "delta": delta, "recommended_bias": bias}


async def process_post(conn, post: dict):
    winner = "A" if post["a_rate"] >= post["b_rate"] else "B"
    lesson = await generate_lesson(post)

    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO lessons_learned
                (post_id, summary, winning_style, winning_platform,
                 engagement_delta, recommended_bias)
            VALUES ($1::uuid, $2, $3::video_style, $4::platform_target, $5, $6::jsonb)
            """,
            post["id"], lesson["summary"], lesson["winning_style"],
            post["platform_target"], lesson["delta"],
            json.dumps(lesson["recommended_bias"]),
        )
        await conn.execute(
            "UPDATE posts SET winning_variant = $1 WHERE id = $2::uuid",
            winner, post["id"],
        )
    log.info("Post %s processed. Winner: %s. Lesson saved.", post["id"], winner)


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    log.info("Connected. Starting analytics feedback loop.")
    try:
        while True:
            try:
                posts = await get_unprocessed_posts(conn)
                log.info("Found %d unprocessed published posts.", len(posts))
                for post in posts:
                    await process_post(conn, post)
            except Exception as exc:
                log.error("Loop error: %s", exc)
            await asyncio.sleep(POLL_INTERVAL_MINUTES * 60)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
