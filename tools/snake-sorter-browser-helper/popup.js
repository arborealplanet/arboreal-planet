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

        for (const img of document.images) {
          const context = `${img.alt || ""} ${img.className || ""} ${img.id || ""}`;
          if (bad.test(context)) continue;
          add(img.currentSrc || img.src);
          for (const part of (img.srcset || "").split(",")) {
            add(part.trim().split(/\s+/)[0]);
          }
        }

        return {
          source_url: location.href,
          title: document.title,
          image_urls: refs.slice(0, 20),
        };
      },
    });

    if (!result?.source_url) throw new Error("Could not read this listing.");

    const response = await fetch("https://arboreal-planet.vercel.app/api/snake-sorter/acquisition/browser-import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Snake Sorter rejected the import.");

    show(`Attached ${data.attached ?? 0} live reference(s) to ${data.title || "the listing"}.`);
  } catch (error) {
    show(error instanceof Error ? error.message : "Import failed.");
  } finally {
    button.disabled = false;
  }
});