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
MM_LISTING_RE = re.compile(
    r"^https://(?:www\.)?morphmarket\.com/(?:us|eu|za|mx)/c/reptiles/pythons/green-tree-pythons/\d+/?(?:\?.*)?$",
    re.I,
)

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


def valid_listing_url(url: str) -> bool:
    return bool(MM_LISTING_RE.match(url.strip()))


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


def recover_stale_jobs() -> int:
    response = rest(
        "rpc/recover_snake_sorter_capture_jobs",
        method="POST",
        headers={"Content-Type": "application/json"},
        data="{}",
    )
    response.raise_for_status()
    value = response.json()
    return int(value or 0)


def fetch_next_job() -> Job | None:
    response = rest(
        "rpc/claim_snake_sorter_capture_job",
        method="POST",
        headers={"Content-Type": "application/json"},
        data="{}",
    )
    response.raise_for_status()
    row = response.json()
    if not row:
        return None
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
        f"?staged_content_sha256=eq.{quote(sha256)}"
        "&select=id,candidate_id&limit=1"
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
            "worker_version": 3,
            "gallery_scoped": True,
            "dominant_gallery_image_only": True,
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


async def gallery_root(page: Page) -> ElementHandle | None:
    """
    Find the smallest plausible listing-gallery container instead of scanning the
    whole page. This prevents large images from related listings or seller pages
    from being captured as if they belonged to the current animal.
    """
    preview_url = None
    try:
        preview_url = await page.locator('meta[property="og:image"]').get_attribute("content")
        if not preview_url:
            preview_url = await page.locator('meta[name="twitter:image"]').get_attribute("content")
    except Exception:
        preview_url = None

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
            if width < 260 or height < 180 or area < 70000:
                continue

            src = (
                await handle.get_attribute("src")
                or await handle.get_attribute("data-src")
                or await handle.get_attribute("data-original")
                or ""
            )
            if not src or BAD_SRC_RE.search(src):
                continue

            absolute_src = job_safe_absolute(page.url, src)
            score = area

            if preview_url and absolute_src == preview_url:
                score *= 8.0
            elif preview_url:
                try:
                    if urlparse(absolute_src).hostname == urlparse(preview_url).hostname:
                        score *= 2.5
                except Exception:
                    pass

            alt = (await handle.get_attribute("alt") or "").lower()
            if re.search(r"logo|avatar|seller|profile|store|related", alt):
                continue

            ranked.append((score, handle))
        except Exception:
            continue

    if not ranked:
        return None

    ranked.sort(key=lambda item: item[0], reverse=True)
    anchor = ranked[0][1]

    try:
        root_handle = await anchor.evaluate_handle(
            """(img) => {
              let node = img;
              let best = img.parentElement;
              for (let depth = 0; depth < 7 && node && node.parentElement; depth++) {
                node = node.parentElement;
                const rect = node.getBoundingClientRect();
                const imgs = Array.from(node.querySelectorAll('img'));
                const visibleLarge = imgs.filter((candidate) => {
                  const r = candidate.getBoundingClientRect();
                  return r.width >= 120 && r.height >= 90 && r.bottom >= 0 && r.right >= 0;
                });
                const nextControls = node.querySelectorAll(
                  'button[aria-label*="next" i], [role="button"][aria-label*="next" i], button[title*="next" i], a[aria-label*="next" i], [data-testid*="next" i]'
                ).length;
                const plausibleSize = rect.width >= 280 && rect.height >= 180 &&
                  rect.width <= Math.max(window.innerWidth * 1.1, 1600) &&
                  rect.height <= Math.max(window.innerHeight * 1.6, 1800);
                if (plausibleSize && visibleLarge.length >= 1 && visibleLarge.length <= 24) {
                  best = node;
                  if (nextControls > 0 || visibleLarge.length >= 2) break;
                }
              }
              return best || img.parentElement;
            }"""
        )
        element = root_handle.as_element()
        if element:
            return element
    except Exception:
        pass

    return anchor


async def likely_gallery_images(page: Page, root: ElementHandle | None) -> list[ElementHandle]:
    host = await preview_host(page)
    handles = await (root.query_selector_all("img") if root else page.query_selector_all("img"))
    ranked: list[tuple[float, ElementHandle]] = []

    root_box = None
    if root:
        try:
            root_box = await root.bounding_box()
        except Exception:
            root_box = None

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

            # The gallery root lets us accept thumbnails as well as the main view.
            minimum_area = 18000 if root else 70000
            if width < (120 if root else 260) or height < (90 if root else 180) or area < minimum_area:
                continue

            src = (
                await handle.get_attribute("src")
                or await handle.get_attribute("data-src")
                or await handle.get_attribute("data-original")
                or ""
            )
            if not src or BAD_SRC_RE.search(src):
                continue

            alt = (await handle.get_attribute("alt") or "").lower()
            if re.search(r"logo|avatar|seller|profile|store|related|recommended", alt):
                continue

            absolute_src = job_safe_absolute(page.url, src)
            src_host = urlparse(absolute_src).hostname
            score = area

            if host and src_host == host:
                score *= 2.0

            if root_box:
                # Favor images centered inside the detected gallery rather than
                # edge decorations or neighboring cards.
                cx = float(box["x"]) + width / 2
                cy = float(box["y"]) + height / 2
                rx = float(root_box["x"])
                ry = float(root_box["y"])
                rw = float(root_box["width"])
                rh = float(root_box["height"])
                if rx <= cx <= rx + rw and ry <= cy <= ry + rh:
                    score *= 1.5

            ranked.append((score, handle))
        except Exception:
            continue

    ranked.sort(key=lambda item: item[0], reverse=True)

    # Rendered capture intentionally takes only the dominant displayed gallery
    # image for each gallery state. Thumbnail strips remain useful for
    # navigation but are not captured as separate training candidates.
    return [ranked[0][1]] if ranked else []


def job_safe_absolute(base: str, src: str) -> str:
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("/"):
        parsed = urlparse(base)
        return f"{parsed.scheme}://{parsed.netloc}{src}"
    return src


async def capture_unique_gallery_images(page: Page, root: ElementHandle | None, seen_hashes: set[str]) -> list[bytes]:
    captures: list[bytes] = []
    for handle in await likely_gallery_images(page, root):
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


async def click_next_gallery(page: Page, root: ElementHandle | None) -> bool:
    selectors = [
        'button[aria-label*="next" i]',
        '[role="button"][aria-label*="next" i]',
        'button[title*="next" i]',
        'a[aria-label*="next" i]',
        '[data-testid*="next" i]',
    ]

    # Never click a generic "next" elsewhere on the page. If a gallery root
    # cannot be identified, stop rather than risk navigating related content.
    if not root:
        return False

    for selector in selectors:
        try:
            items = await root.query_selector_all(selector)
        except Exception:
            continue
        for item in items[:4]:
            try:
                if not await item.is_visible() or not await item.is_enabled():
                    continue
                await item.click(timeout=2500)
                await polite_wait(page, 700, 1600)
                return True
            except Exception:
                continue
    return False


async def process_job(job: Job, headless: bool = True) -> tuple[str, int, int, int | None, str | None]:
    if not valid_listing_url(job.source_url):
        return ("failed", 0, 0, None, "Capture job source is not an approved MorphMarket GTP listing URL.")

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

            final_url = page.url
            if await page_is_blocked(page, status_code):
                return ("blocked", 0, 0, status_code, "Access-control or challenge page encountered.")
            if not valid_listing_url(final_url):
                return ("blocked", 0, 0, status_code, "Listing navigation left the approved MorphMarket GTP listing path.")

            await polite_wait(page, 1400, 3600)
            seen_hashes: set[str] = set()
            order = next_media_order(job.candidate_id)
            root = await gallery_root(page)

            if root is None:
                return ("failed", 0, 0, status_code, "Could not identify a listing-gallery container safely.")

            for _ in range(MAX_CAPTURES):
                current = await capture_unique_gallery_images(page, root, seen_hashes)
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
                    return ("blocked", captured, discovered, status_code, "Access-control or challenge page encountered after gallery navigation.")
                if not await click_next_gallery(page, root):
                    break

            return ("completed", captured, discovered, status_code, None)
        except Exception as exc:
            return ("failed", captured, discovered, status_code, str(exc)[:1000])
        finally:
            await context.close()
            await browser.close()


async def self_test() -> int:
    html = """
    <!doctype html>
    <html>
      <head>
        <meta property="og:image" content="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='700'%3E%3Crect width='900' height='700' fill='green'/%3E%3C/svg%3E">
      </head>
      <body style="margin:0;background:#111">
        <main>
          <section id="listing-gallery" style="width:900px;height:760px;position:relative">
            <img id="main-image"
              alt="Green tree python listing photo"
              style="display:block;width:900px;height:700px;object-fit:cover"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='700'%3E%3Crect width='900' height='700' fill='green'/%3E%3C/svg%3E">
            <button aria-label="Next image" onclick="document.getElementById('main-image').src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%22700%22%3E%3Crect width=%22900%22 height=%22700%22 fill=%22blue%22/%3E%3C/svg%3E'">Next</button>
          </section>
          <section id="related">
            <img alt="Related listing" style="display:block;width:700px;height:600px"
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='700' height='600'%3E%3Crect width='700' height='600' fill='red'/%3E%3C/svg%3E">
          </section>
        </main>
      </body>
    </html>
    """

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"])
        context = await browser.new_context(viewport={"width": 1200, "height": 1000})
        page = await context.new_page()
        try:
            await page.set_content(html, wait_until="load")
            root = await gallery_root(page)
            if root is None:
                raise RuntimeError("Self-test failed: gallery root not detected.")

            seen: set[str] = set()
            first = await capture_unique_gallery_images(page, root, seen)
            if len(first) != 1:
                raise RuntimeError(f"Self-test failed: expected one dominant first image, got {len(first)}.")

            clicked = await click_next_gallery(page, root)
            if not clicked:
                raise RuntimeError("Self-test failed: gallery next control was not clicked.")

            second = await capture_unique_gallery_images(page, root, seen)
            if len(second) != 1:
                raise RuntimeError(f"Self-test failed: expected one new second image, got {len(second)}.")

            if hashlib.sha256(first[0]).hexdigest() == hashlib.sha256(second[0]).hexdigest():
                raise RuntimeError("Self-test failed: gallery state did not change.")

            related = page.locator("#related img")
            related_box = await related.bounding_box()
            if not related_box:
                raise RuntimeError("Self-test failed: related listing fixture missing.")

            print(json.dumps({
                "ok": True,
                "gallery_scoped": True,
                "dominant_image_only": True,
                "gallery_states_verified": 2,
            }))
            return 0
        finally:
            await context.close()
            await browser.close()


async def run(limit: int, headless: bool = True) -> int:
    require_env()
    recovered = recover_stale_jobs()
    processed = 0

    for _ in range(limit):
        job = fetch_next_job()
        if not job:
            break

        status, captured, discovered, http_status, error = await process_job(job, headless=headless)
        patch_job(
            job.id,
            {
                "status": status,
                "last_http_status": http_status,
                "last_error": error,
                "captured_media_count": captured,
                "discovered_media_count": discovered,
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

    print(json.dumps({"processed_jobs": processed, "recovered_stale_jobs": recovered}))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return asyncio.run(self_test())
    return asyncio.run(run(max(1, min(args.limit, 5)), headless=not args.headed))


if __name__ == "__main__":
    sys.exit(main())
