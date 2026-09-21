#!/usr/bin/env python3
"""
Snake Sorter rendered-capture worker.

Processes queued Snake Sorter capture jobs conservatively:
- one MorphMarket listing at a time
- stops immediately on 403/429/challenge pages
- never logs in, solves CAPTCHAs, rotates identities, or bypasses access controls
- captures only likely listing-gallery images
- attaches all captures to the same acquisition candidate
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import random
import re
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any
from urllib.parse import quote, urlparse

import requests
from playwright.async_api import async_playwright, Page, ElementHandle

SUPABASE_URL = os.environ.get("SNAKE_SORTER_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SNAKE_SORTER_SUPABASE_SERVICE_ROLE_KEY", "").strip()
USER_AGENT = "SnakeSorterCaptureWorker/1.0 (+private owner-reviewed reference workflow)"
BUCKET = "snake-sorter-acquisition"
MAX_CAPTURES = 12

BLOCK_RE = re.compile(
    r"captcha|access denied|too many requests|verify you are human|challenge-platform|cloudflare",
    re.I,
)

BAD_SRC_RE = re.compile(
    r"favicon|logo|avatar|badge|icon|sprite|flag|placeholder|profile|seller|store-logo|brandmark",
    re.I,
)


@dataclass
class Job:
    id: str
    candidate_id: str
    source_url: str
    attempt_count: int


def require_env() -> None:
    if not SUPABASE_URL or not SERVICE_KEY:
        raise RuntimeError(
            "SNAKE_SORTER_SUPABASE_URL and SNAKE_SORTER_SUPABASE_SERVICE_ROLE_KEY are required."
        )


def api_headers(content_type: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Accept": "application/json",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def rest(path: str, method: str = "GET", **kwargs: Any) -> requests.Response:
    return requests.request(
        method,
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**api_headers(), **kwargs.pop("headers", {})},
        timeout=45,
        **kwargs,
    )


def patch_job(job_id: str, payload: dict[str, Any]) -> None:
    payload = {**payload, "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    response = rest(
        f"snake_sorter_capture_jobs?id=eq.{quote(job_id)}",
        method="PATCH",
        headers={"Content-Type": "application/json", "Prefer": "return=minimal"},
        data=json.dumps(payload),
    )
    response.raise_for_status()


def fetch_next_job() -> Job | None:
    response = rest(
        "snake_sorter_capture_jobs?status=eq.queued&select=id,candidate_id,source_url,attempt_count"
        "&order=requested_at.asc&limit=1"
    )
    response.raise_for_status()
    rows = response.json()
    if not rows:
        return None
    row = rows[0]
    return Job(
        id=row["id"],
        candidate_id=row["candidate_id"],
        source_url=row["source_url"],
        attempt_count=int(row.get("attempt_count") or 0),
    )


def next_media_order(candidate_id: str) -> int:
    response = rest(
        "snake_sorter_acquisition_media"
        f"?candidate_id=eq.{quote(candidate_id)}"
        "&select=media_order&order=media_order.desc&limit=1"
    )
    response.raise_for_status()
    rows = response.json()
    return int(rows[0]["media_order"]) + 1 if rows else 0


def hash_exists(candidate_id: str, sha256: str) -> bool:
    response = rest(
        "snake_sorter_acquisition_media"
        f"?candidate_id=eq.{quote(candidate_id)}"
        f"&staged_content_sha256=eq.{quote(sha256)}"
        "&select=id&limit=1"
    )
    response.raise_for_status()
    return bool(response.json())


def upload_capture(candidate_id: str, job: Job, image_bytes: bytes, order: int) -> str | None:
    sha256 = hashlib.sha256(image_bytes).hexdigest()
    if hash_exists(candidate_id, sha256):
        return None

    path = f"{candidate_id}/rendered-{order:02d}-{uuid.uuid4()}.png"
    object_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{quote(path, safe='/')}"
    upload = requests.post(
        object_url,
        headers={
            **api_headers("image/png"),
            "x-upsert": "false",
        },
        data=image_bytes,
        timeout=45,
    )
    upload.raise_for_status()

    payload = {
        "candidate_id": candidate_id,
        "source_page_url": job.source_url,
        "media_order": order,
        "capture_method": "rendered_capture",
        "rights_status": "metadata_only",
        "review_status": "pending",
        "view_type": "unknown",
        "quality_status": "unreviewed",
        "staged_storage_path": path,
        "staged_content_sha256": sha256,
        "staged_mime_type": "image/png",
        "staged_bytes": len(image_bytes),
        "staged_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_metadata": {
            "capture_job_id": job.id,
            "rendered_capture": True,
            "worker_version": 1,
        },
    }
    insert = rest(
        "snake_sorter_acquisition_media",
        method="POST",
        headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        data=json.dumps(payload),
    )
    if not insert.ok:
        requests.delete(
            object_url,
            headers=api_headers(),
            timeout=30,
        )
        insert.raise_for_status()

    rows = insert.json()
    return rows[0]["id"] if rows else None


async def polite_wait(page: Page, minimum_ms: int = 900, maximum_ms: int = 2400) -> None:
    await page.wait_for_timeout(random.randint(minimum_ms, maximum_ms))


async def page_is_blocked(page: Page, status: int | None) -> bool:
    if status in (403, 429):
        return True
    try:
        text = (await page.locator("body").inner_text(timeout=2500))[:15000]
    except Exception:
        return False
    return bool(BLOCK_RE.search(text))


async def preview_host(page: Page) -> str | None:
    try:
        value = await page.locator('meta[property="og:image"]').get_attribute("content")
        if not value:
            value = await page.locator('meta[name="twitter:image"]').get_attribute("content")
        if value:
            return urlparse(value).hostname
    except Exception:
        pass
    return None


async def likely_gallery_images(page: Page) -> list[ElementHandle]:
    host = await preview_host(page)
    handles = await page.query_selector_all("img")
    ranked: list[tuple[float, ElementHandle]] = []

    for handle in handles:
        try:
            if not await handle.is_visible():
                continue
            box = await handle.bounding_box()
            if not box:
                continue
            width = float(box["width"])
            height = float(box["height"])
            area = width * height
            if width < 220 or height < 160 or area < 50000:
                continue

            src = (
                await handle.get_attribute("src")
                or await handle.get_attribute("data-src")
                or await handle.get_attribute("data-original")
                or ""
            )
            if not src or BAD_SRC_RE.search(src):
                continue

            src_host = urlparse(src if src.startswith("http") else job_safe_absolute(page.url, src)).hostname
            score = area
            if host and src_host == host:
                score *= 2.0

            alt = (await handle.get_attribute("alt") or "").lower()
            if re.search(r"logo|avatar|seller|profile|store", alt):
                continue

            ranked.append((score, handle))
        except Exception:
            continue

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [handle for _, handle in ranked[:6]]


def job_safe_absolute(base: str, src: str) -> str:
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        parsed = urlparse(base)
        return f"{parsed.scheme}://{parsed.netloc}{src}"
    return src


async def capture_unique_gallery_images(page: Page, seen_hashes: set[str]) -> list[bytes]:
    captures: list[bytes] = []
    for handle in await likely_gallery_images(page):
        if len(captures) + len(seen_hashes) >= MAX_CAPTURES:
            break
        try:
            image_bytes = await handle.screenshot(type="png", animations="disabled")
        except Exception:
            continue
        digest = hashlib.sha256(image_bytes).hexdigest()
        if digest in seen_hashes:
            continue
        seen_hashes.add(digest)
        captures.append(image_bytes)
    return captures


async def click_next_gallery(page: Page) -> bool:
    selectors = [
        'button[aria-label*="next" i]',
        '[role="button"][aria-label*="next" i]',
        'button[title*="next" i]',
        'a[aria-label*="next" i]',
        '[data-testid*="next" i]',
    ]
    for selector in selectors:
        locator = page.locator(selector)
        try:
            count = await locator.count()
        except Exception:
            continue
        for index in range(min(count, 4)):
            item = locator.nth(index)
            try:
                if not await item.is_visible() or not await item.is_enabled():
                    continue
                await item.click(timeout=2500)
                await polite_wait(page, 700, 1600)
                return True
            except Exception:
                continue
    return False


async def process_job(job: Job, headless: bool = True) -> tuple[str, int, int | None, str | None]:
    patch_job(
        job.id,
        {
            "status": "processing",
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "attempt_count": job.attempt_count + 1,
            "last_error": None,
        },
    )

    captured = 0
    discovered = 0
    status_code: int | None = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=["--disable-dev-shm-usage", "--no-sandbox"],
        )
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1440, "height": 1200},
            locale="en-US",
        )
        page = await context.new_page()

        try:
            response = await page.goto(job.source_url, wait_until="domcontentloaded", timeout=45000)
            status_code = response.status if response else None
            if await page_is_blocked(page, status_code):
                return ("blocked", 0, status_code, "Access-control or challenge page encountered.")

            await polite_wait(page, 1400, 3600)
            seen_hashes: set[str] = set()
            order = next_media_order(job.candidate_id)

            for _ in range(MAX_CAPTURES):
                current = await capture_unique_gallery_images(page, seen_hashes)
                discovered += len(current)

                for image_bytes in current:
                    media_id = upload_capture(job.candidate_id, job, image_bytes, order)
                    if media_id:
                        captured += 1
                        order += 1
                    if captured >= MAX_CAPTURES:
                        break

                if captured >= MAX_CAPTURES:
                    break
                if await page_is_blocked(page, status_code):
                    return ("blocked", captured, status_code, "Access-control or challenge page encountered after gallery navigation.")
                if not await click_next_gallery(page):
                    break

            return ("completed", captured, status_code, None)
        except Exception as exc:
            return ("failed", captured, status_code, str(exc)[:1000])
        finally:
            await context.close()
            await browser.close()


async def run(limit: int, headless: bool = True) -> int:
    require_env()
    processed = 0

    for _ in range(limit):
        job = fetch_next_job()
        if not job:
            break

        status, captured, http_status, error = await process_job(job, headless=headless)
        patch_job(
            job.id,
            {
                "status": status,
                "last_http_status": http_status,
                "last_error": error,
                "captured_media_count": captured,
                "discovered_media_count": captured,
                "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            },
        )

        if captured:
            response = rest(
                f"snake_sorter_acquisition_candidates?id=eq.{quote(job.candidate_id)}",
                method="PATCH",
                headers={"Content-Type": "application/json", "Prefer": "return=minimal"},
                data=json.dumps({"acquisition_stage": "media_collected"}),
            )
            response.raise_for_status()

        processed += 1
        if status == "blocked":
            break
        if processed < limit:
            await asyncio.sleep(random.uniform(6.0, 15.0))

    print(json.dumps({"processed_jobs": processed}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()
    return asyncio.run(run(max(1, min(args.limit, 5)), headless=not args.headed))


if __name__ == "__main__":
    sys.exit(main())
