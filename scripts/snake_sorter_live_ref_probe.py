#!/usr/bin/env python3
"""
One-listing live-reference probe for Snake Sorter.

This intentionally performs exactly one ordinary HTTP GET against a known
MorphMarket GTP listing and never follows access-control challenges.
It does not download gallery images and does not write to Supabase.
"""

from __future__ import annotations

import html as html_lib
import json
import re
import sys
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

LISTING_URL = "https://www.morphmarket.com/us/c/reptiles/pythons/green-tree-pythons/3929286"
USER_AGENT = "SnakeSorterLiveRefProbe/1.0 (+single-listing validation)"
BLOCK_RE = re.compile(r"captcha|access denied|too many requests|verify you are human|challenge-platform|cloudflare", re.I)
BAD_RE = re.compile(r"favicon|logo|avatar|badge|icon|sprite|flag|placeholder|profile|seller|store-logo|brandmark", re.I)


def decode(value: str) -> str:
    return html_lib.unescape(value or "").replace("\\/", "/").replace("\\u0026", "&").strip()


def meta_content(page: str, key: str) -> str:
    patterns = [
        rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']+)["\']',
        rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{re.escape(key)}["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, page, re.I)
        if match:
            return decode(match.group(1))
    return ""


def normalize(raw: str) -> str | None:
    raw = decode(raw)
    if not raw or raw.startswith(("data:", "blob:")):
        return None
    try:
        absolute = urljoin(LISTING_URL, raw)
        parsed = urlparse(absolute)
    except Exception:
        return None
    if parsed.scheme not in ("http", "https"):
        return None
    if BAD_RE.search(absolute):
        return None
    return absolute


def add_url(out: list[str], seen: set[str], raw: str) -> None:
    value = normalize(raw)
    if not value or value in seen:
        return
    seen.add(value)
    out.append(value)


def json_ld_images(page: str) -> list[str]:
    found: list[str] = []
    scripts = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        page,
        re.I,
    )

    def walk(value):
        if isinstance(value, str):
            if value.startswith(("http://", "https://")):
                found.append(value)
        elif isinstance(value, list):
            for item in value:
                walk(item)
        elif isinstance(value, dict):
            for key, item in value.items():
                if key in ("image", "contentUrl", "thumbnailUrl"):
                    walk(item)

    for body in scripts:
        try:
            walk(json.loads(body.strip()))
        except Exception:
            pass
    return found


def extract_refs(page: str) -> list[str]:
    refs: list[str] = []
    seen: set[str] = set()

    for key in ("og:image", "twitter:image"):
        add_url(refs, seen, meta_content(page, key))

    for raw in json_ld_images(page):
        add_url(refs, seen, raw)

    for tag in re.findall(r"<img\b[^>]*>", page, re.I):
        if re.search(r"avatar|logo|icon|badge|seller|store|profile|flag", tag, re.I):
            continue

        for attr in ("src", "data-src", "data-original", "data-lazy-src"):
            for raw in re.findall(rf'{attr}\s*=\s*["\']([^"\']+)["\']', tag, re.I):
                add_url(refs, seen, raw)

        srcset = re.search(r'srcset\s*=\s*["\']([^"\']+)["\']', tag, re.I)
        if srcset:
            for part in srcset.group(1).split(","):
                raw = part.strip().split()[0] if part.strip() else ""
                add_url(refs, seen, raw)

    return refs[:20]


def main() -> int:
    request = Request(
        LISTING_URL,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=30) as response:
            status = int(response.status)
            final_url = response.geturl()
            body = response.read(3_000_000).decode("utf-8", "replace")
    except HTTPError as exc:
        blocked = exc.code in (403, 429)
        print(json.dumps({
            "ok": blocked,
            "http_status": exc.code,
            "blocked": blocked,
            "server_side_live_ref_supported": False if blocked else None,
            "reason": "access-control signal encountered" if blocked else "http error",
        }))
        return 0 if blocked else 2
    except URLError as exc:
        print(json.dumps({"ok": False, "network_error": str(exc.reason)}))
        return 3

    if status in (403, 429) or BLOCK_RE.search(body):
        print(json.dumps({
            "ok": True,
            "http_status": status,
            "blocked": True,
            "server_side_live_ref_supported": False,
            "reason": "access-control signal encountered; stopped without retry or bypass",
        }))
        return 0

    refs = extract_refs(body)
    title = meta_content(body, "og:title") or re.sub(r"\s+", " ", re.search(r"<title[^>]*>([\s\S]*?)</title>", body, re.I).group(1)).strip() if re.search(r"<title[^>]*>([\s\S]*?)</title>", body, re.I) else ""

    result = {
        "ok": True,
        "http_status": status,
        "final_url": final_url,
        "title": decode(title),
        "image_reference_count": len(refs),
        "image_hosts": sorted({urlparse(ref).hostname for ref in refs if urlparse(ref).hostname}),
        "references": refs,
        "downloaded_images": 0,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
