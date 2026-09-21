#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import contextlib
import http.server
import socketserver
import threading
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
CONTENT_JS = ROOT / "tools" / "snake-sorter-browser-helper" / "content.js"

HTML = """<!doctype html>
<html>
<head>
  <meta property="og:image" content="/snake1.svg">
  <meta name="twitter:image" content="/snake1.svg">
  <title>Red Cyclops by Test Breeder - MorphMarket</title>
</head>
<body style="margin:0">
  <main>
    <section id="gallery" style="width:900px;height:700px;position:relative">
      <img id="main-image" alt="Green tree python listing photo"
           src="/snake1.svg"
           style="display:block;width:700px;height:550px;object-fit:contain">
      <button aria-label="Next image"
        onclick="document.getElementById('main-image').src='/snake2.svg'">Next</button>
    </section>
    <section id="related">
      <img alt="Related listing" src="/related.svg"
           style="display:block;width:650px;height:500px">
    </section>
  </main>
</body>
</html>"""

SVG = {
    "/snake1.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="green"/></svg>""",
    "/snake2.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="blue"/></svg>""",
    "/related.svg": """<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="red"/></svg>""",
}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path.startswith("/listing"):
            body = HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
        elif self.path in SVG:
            body = SVG[self.path].encode()
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
        else:
            body = b"not found"
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def local_server():
    with socketserver.TCPServer(("127.0.0.1", 0), Handler) as server:
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}/listing"
        finally:
            server.shutdown()
            thread.join(timeout=2)


async def main() -> int:
    source = CONTENT_JS.read_text(encoding="utf-8")

    with local_server() as url:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-dev-shm-usage", "--no-sandbox"],
            )
            context = await browser.new_context(viewport={"width": 1200, "height": 900})
            page = await context.new_page()

            await page.add_init_script(
                """
                window.chrome = {
                  runtime: {
                    onMessage: {
                      addListener: function () {}
                    }
                  }
                };
                """
            )
            await page.goto(url, wait_until="networkidle")
            await page.add_script_tag(content=source)

            listing = await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.readListing()"
            )
            if not listing.get("ok"):
                raise RuntimeError(f"readListing failed: {listing}")
            refs = listing.get("image_urls") or []
            if not any("snake1.svg" in ref for ref in refs):
                raise RuntimeError(f"listing image missing from refs: {refs}")
            if any("related.svg" in ref for ref in refs):
                raise RuntimeError(f"related listing leaked into refs: {refs}")

            first = await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.prepareCapture()"
            )
            if not first.get("ok") or "snake1.svg" not in first.get("fingerprint", ""):
                raise RuntimeError(f"first capture state invalid: {first}")

            await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.removeOverlay()"
            )
            clicked = await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.clickNext()"
            )
            if not clicked:
                raise RuntimeError("gallery next control was not clicked")

            await page.wait_for_timeout(250)
            second = await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.prepareCapture()"
            )
            if not second.get("ok") or "snake2.svg" not in second.get("fingerprint", ""):
                raise RuntimeError(f"second capture state invalid: {second}")
            if second.get("fingerprint") == first.get("fingerprint"):
                raise RuntimeError("gallery fingerprint did not change")

            await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.removeOverlay()"
            )
            await page.evaluate(
                "() => { document.body.innerHTML = '<div>Verify you are human</div>'; }"
            )
            blocked = await page.evaluate(
                "() => globalThis.__snakeSorterContentBridgeTestHooks.readListing()"
            )
            if not blocked.get("blocked"):
                raise RuntimeError(f"challenge stop failed: {blocked}")

            await context.close()
            await browser.close()

    print("Snake Sorter browser helper offline self-test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
