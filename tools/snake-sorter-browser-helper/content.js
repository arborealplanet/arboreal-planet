if (!globalThis.__snakeSorterContentBridgeLoaded) {
  globalThis.__snakeSorterContentBridgeLoaded = true;

const BLOCK_RE = /captcha|access denied|too many requests|verify you are human|challenge-platform|cloudflare/i;
const BAD_RE = /favicon|logo|avatar|badge|icon|sprite|flag|placeholder|profile|seller|store-logo|brandmark|related|recommended/i;
const NEXT_SELECTOR = 'button[aria-label*="next" i], [role="button"][aria-label*="next" i], button[title*="next" i], a[aria-label*="next" i], [data-testid*="next" i]';
const OVERLAY_ATTR = "data-snake-sorter-capture-overlay";

function meta(name) {
  const el = document.querySelector('meta[property="' + name + '"],meta[name="' + name + '"]');
  return el ? el.content || "" : "";
}

function challenged() {
  const bodyText = (document.body && document.body.innerText ? document.body.innerText : "").slice(0, 20000);
  return BLOCK_RE.test(bodyText);
}

function findGalleryRoot() {
  const ogImage = meta("og:image");
  const candidates = Array.from(document.images)
    .map((img) => {
      const rect = img.getBoundingClientRect();
      const source = img.currentSrc || img.src || "";
      const context = (img.alt || "") + " " + (img.className || "") + " " + (img.id || "");
      let score = Math.max(0, rect.width * rect.height);

      if (!source || BAD_RE.test(context) || BAD_RE.test(source)) return null;
      if (rect.width < 220 || rect.height < 160 || score < 50000) return null;

      try {
        const sourceUrl = new URL(source, location.href);
        const ogUrl = ogImage ? new URL(ogImage, location.href) : null;
        if (ogUrl && sourceUrl.href === ogUrl.href) score *= 8;
        else if (ogUrl && sourceUrl.hostname === ogUrl.hostname) score *= 2.5;
      } catch {}

      return { img, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const anchor = candidates[0] ? candidates[0].img : null;
  if (!anchor) return { root: null, anchor: null };

  let root = anchor.parentElement;
  let node = anchor;

  for (let depth = 0; depth < 7 && node && node.parentElement; depth++) {
    node = node.parentElement;
    const rect = node.getBoundingClientRect();
    const imgs = Array.from(node.querySelectorAll("img")).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width >= 100 && r.height >= 80;
    });
    const nextControls = node.querySelectorAll(NEXT_SELECTOR).length;
    const plausible =
      rect.width >= 260 &&
      rect.height >= 160 &&
      rect.width <= Math.max(innerWidth * 1.15, 1700) &&
      rect.height <= Math.max(innerHeight * 1.7, 1900);

    if (plausible && imgs.length >= 1 && imgs.length <= 24) {
      root = node;
      if (nextControls > 0 || imgs.length >= 2) break;
    }
  }

  return { root, anchor };
}

function readListing() {
  if (challenged()) {
    return { ok: false, blocked: true, error: "Access-control or challenge page detected." };
  }

  const seen = new Set();
  const refs = [];
  const add = (raw) => {
    if (!raw) return;
    try {
      const url = new URL(raw, location.href).href;
      if (!/^https?:/i.test(url) || BAD_RE.test(url) || seen.has(url)) return;
      seen.add(url);
      refs.push(url);
    } catch {}
  };

  add(meta("og:image"));
  add(meta("twitter:image"));

  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const walk = (value) => {
        if (!value) return;
        if (typeof value === "string") {
          if (/^https?:\/\//i.test(value)) add(value);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        if (typeof value === "object") {
          for (const [key, item] of Object.entries(value)) {
            if (["image", "contentUrl", "thumbnailUrl"].includes(key)) walk(item);
          }
        }
      };
      walk(JSON.parse(script.textContent || "null"));
    } catch {}
  }

  const found = findGalleryRoot();
  const scopedImages = found.root ? Array.from(found.root.querySelectorAll("img")) : [];

  for (const img of scopedImages) {
    const rect = img.getBoundingClientRect();
    const context = (img.alt || "") + " " + (img.className || "") + " " + (img.id || "");
    if (BAD_RE.test(context) || rect.width < 90 || rect.height < 70) continue;
    add(img.currentSrc || img.src);
    for (const part of (img.srcset || "").split(",")) {
      const raw = part.trim() ? part.trim().split(/\s+/)[0] : "";
      add(raw);
    }
  }

  return {
    ok: true,
    source_url: location.href,
    title: document.title,
    description: meta("og:description"),
    image_urls: refs.slice(0, 20),
  };
}

async function prepareCapture() {
  if (challenged()) {
    return { ok: false, blocked: true, error: "Access-control or challenge page detected." };
  }

  document.querySelector("[" + OVERLAY_ATTR + "]")?.remove();

  const found = findGalleryRoot();
  if (!found.anchor) {
    return { ok: false, error: "Could not identify the listing gallery image." };
  }

  const visibleImages = Array.from((found.root || found.anchor.parentElement).querySelectorAll("img"))
    .map((img) => {
      const rect = img.getBoundingClientRect();
      const source = img.currentSrc || img.src || "";
      const context = (img.alt || "") + " " + (img.className || "") + " " + (img.id || "");
      if (!source || BAD_RE.test(context) || BAD_RE.test(source)) return null;
      if (rect.width < 160 || rect.height < 110) return null;
      return { img, area: rect.width * rect.height };
    })
    .filter(Boolean)
    .sort((a, b) => b.area - a.area);

  const mainImage = visibleImages[0] ? visibleImages[0].img : found.anchor;
  const source = mainImage.currentSrc || mainImage.src || "";
  if (!source) return { ok: false, error: "Gallery image has no usable source." };

  const fingerprint = [
    source,
    mainImage.naturalWidth || 0,
    mainImage.naturalHeight || 0,
    mainImage.alt || "",
  ].join("|");

  const overlay = document.createElement("div");
  overlay.setAttribute(OVERLAY_ATTR, "1");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  });

  const clone = document.createElement("img");
  clone.src = source;
  clone.alt = "";
  Object.assign(clone.style, {
    display: "block",
    maxWidth: "96vw",
    maxHeight: "96vh",
    width: "auto",
    height: "auto",
    objectFit: "contain",
  });

  overlay.appendChild(clone);
  document.documentElement.appendChild(overlay);

  try {
    await clone.decode();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const rect = clone.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) {
    overlay.remove();
    return { ok: false, error: "Rendered gallery image was too small to capture." };
  }

  const hasNext = Boolean(found.root && found.root.querySelector(NEXT_SELECTOR));

  return {
    ok: true,
    blocked: false,
    fingerprint,
    has_next: hasNext,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    viewport: { width: innerWidth, height: innerHeight },
  };
}

function removeOverlay() {
  document.querySelector("[" + OVERLAY_ATTR + "]")?.remove();
  return true;
}

function clickNext() {
  const found = findGalleryRoot();
  if (!found.root) return false;

  for (const item of found.root.querySelectorAll(NEXT_SELECTOR)) {
    const style = getComputedStyle(item);
    const rect = item.getBoundingClientRect();
    const disabled =
      item.hasAttribute("disabled") ||
      item.getAttribute("aria-disabled") === "true" ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      rect.width < 2 ||
      rect.height < 2;
    if (disabled) continue;
    item.click();
    return true;
  }

  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "READ_LISTING") {
    sendResponse(readListing());
    return;
  }

  if (message?.type === "PREPARE_CAPTURE") {
    prepareCapture().then(sendResponse);
    return true;
  }

  if (message?.type === "REMOVE_CAPTURE_OVERLAY") {
    sendResponse({ ok: removeOverlay() });
    return;
  }

  if (message?.type === "CLICK_GALLERY_NEXT") {
    sendResponse({ ok: clickNext() });
  }
});

}
