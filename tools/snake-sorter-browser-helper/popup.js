const statusEl = document.getElementById("status");
const button = document.getElementById("send");

function show(message) {
  statusEl.textContent = message;
}

button.addEventListener("click", async () => {
  button.disabled = true;
  show("Reading current listing…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith("https://www.morphmarket.com/")) {
      throw new Error("Open a MorphMarket listing first.");
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const bad = /favicon|logo|avatar|badge|icon|sprite|flag|placeholder|profile|seller|store-logo|brandmark/i;
        const seen = new Set();
        const refs = [];

        const add = (raw) => {
          if (!raw) return;
          try {
            const url = new URL(raw, location.href).href;
            if (!/^https?:/i.test(url) || bad.test(url) || seen.has(url)) return;
            seen.add(url);
            refs.push(url);
          } catch {}
        };

        const meta = (name) =>
          document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content || "";

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
                  if (["image","contentUrl","thumbnailUrl"].includes(key)) walk(item);
                }
              }
            };
            walk(JSON.parse(script.textContent || "null"));
          } catch {}
        }

        const ogImage = meta("og:image");
        let galleryRoot = null;

        const candidateImages = [...document.images]
          .map((img) => {
            const rect = img.getBoundingClientRect();
            const source = img.currentSrc || img.src || "";
            const context = `${img.alt || ""} ${img.className || ""} ${img.id || ""}`;
            let score = Math.max(0, rect.width * rect.height);

            if (bad.test(context) || bad.test(source)) return null;
            if (rect.width < 220 || rect.height < 160) return null;

            try {
              if (ogImage && new URL(source, location.href).href === new URL(ogImage, location.href).href) {
                score *= 8;
              } else if (ogImage && new URL(source, location.href).hostname === new URL(ogImage, location.href).hostname) {
                score *= 2;
              }
            } catch {}

            return { img, score };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);

        const anchor = candidateImages[0]?.img || null;
        if (anchor) {
          let node = anchor;
          for (let depth = 0; depth < 7 && node?.parentElement; depth++) {
            node = node.parentElement;
            const rect = node.getBoundingClientRect();
            const imgs = [...node.querySelectorAll("img")].filter((img) => {
              const r = img.getBoundingClientRect();
              return r.width >= 100 && r.height >= 80;
            });
            const nextControls = node.querySelectorAll(
              'button[aria-label*="next" i], [role="button"][aria-label*="next" i], button[title*="next" i], a[aria-label*="next" i], [data-testid*="next" i]'
            ).length;
            const plausible =
              rect.width >= 260 &&
              rect.height >= 160 &&
              rect.width <= Math.max(innerWidth * 1.15, 1700) &&
              rect.height <= Math.max(innerHeight * 1.7, 1900);

            if (plausible && imgs.length >= 1 && imgs.length <= 24) {
              galleryRoot = node;
              if (nextControls > 0 || imgs.length >= 2) break;
            }
          }
        }

        const scopedImages = galleryRoot ? [...galleryRoot.querySelectorAll("img")] : [];
        for (const img of scopedImages) {
          const rect = img.getBoundingClientRect();
          const context = `${img.alt || ""} ${img.className || ""} ${img.id || ""}`;
          if (bad.test(context) || rect.width < 90 || rect.height < 70) continue;
          add(img.currentSrc || img.src);
          for (const part of (img.srcset || "").split(",")) {
            add(part.trim().split(/\s+/)[0]);
          }
        }

        return {
          source_url: location.href,
          title: document.title,
          description: meta("og:description"),
          image_urls: refs.slice(0, 20),
        };
      },
    });

    if (!result?.source_url) throw new Error("Could not read this listing.");

    show(`Found ${result.image_urls.length} exposed image reference(s). Sending to Snake Sorter…`);

    const data = await chrome.runtime.sendMessage({
      type: "IMPORT_LISTING_TO_SNAKE_SORTER",
      payload: result,
    });

    if (!data?.ok) throw new Error(data?.error || "Snake Sorter rejected the import.");

    show(
      `Attached ${data.attached ?? 0} live reference(s) to ${data.title || "the listing"}.\n\n` +
      "The Snake Sorter tab has been opened so you can review them."
    );
  } catch (error) {
    show(error instanceof Error ? error.message : "Import failed.");
  } finally {
    button.disabled = false;
  }
});