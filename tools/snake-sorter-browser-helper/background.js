
const APP_URL = "https://arboreal-planet.vercel.app/snake-sorter?browser_helper_import=1";

async function waitForTabComplete(tabId, timeoutMs = 20000) {
  const current = await chrome.tabs.get(tabId);
  if (current?.status === "complete") return;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Snake Sorter did not finish loading."));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete") return;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function ensureAppTab(active = false) {
  const existing = await chrome.tabs.query({
    url: "https://arboreal-planet.vercel.app/snake-sorter*",
  });
  let tab = existing[0];

  if (tab?.id) {
    tab = await chrome.tabs.update(tab.id, { active });
  } else {
    tab = await chrome.tabs.create({ url: APP_URL, active });
  }

  if (!tab?.id) throw new Error("Could not open Snake Sorter.");
  await waitForTabComplete(tab.id);
  return tab;
}

async function appJson(tabId, path, payload) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [path, payload],
    func: async (apiPath, data) => {
      try {
        const response = await fetch(apiPath, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const body = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, ...body };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Snake Sorter request failed.",
        };
      }
    },
  });
  return result;
}

async function importListing(payload, activeAfter = true) {
  if (!payload?.source_url || !Array.isArray(payload?.image_urls)) {
    throw new Error("Browser helper payload is incomplete.");
  }

  const appTab = await ensureAppTab(false);
  const result = await appJson(
    appTab.id,
    "/api/snake-sorter/acquisition/browser-import",
    payload,
  );

  if (!result?.ok) {
    throw new Error(result?.error || "Snake Sorter rejected the browser import.");
  }

  if (activeAfter) {
    await chrome.tabs.update(appTab.id, { active: true });
  }

  return { ...result, app_tab_id: appTab.id };
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function cropVisibleTab(tab, state) {
  await chrome.tabs.update(tab.id, { active: true });
  await new Promise((resolve) => setTimeout(resolve, 120));

  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: "jpeg",
    quality: 94,
  });

  const screenshotBlob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(screenshotBlob);

  const scaleX = bitmap.width / Math.max(1, state.viewport.width);
  const scaleY = bitmap.height / Math.max(1, state.viewport.height);

  const x = Math.max(0, Math.floor(state.rect.x * scaleX));
  const y = Math.max(0, Math.floor(state.rect.y * scaleY));
  const width = Math.max(1, Math.min(bitmap.width - x, Math.ceil(state.rect.width * scaleX)));
  const height = Math.max(1, Math.min(bitmap.height - y, Math.ceil(state.rect.height * scaleY)));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare gallery capture.");

  context.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
  bitmap.close();

  const output = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.92,
  });

  const bytes = new Uint8Array(await output.arrayBuffer());
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) {
    throw new Error("Rendered gallery capture was too large.");
  }

  return {
    mime_type: "image/jpeg",
    image_base64: bytesToBase64(bytes),
  };
}

async function captureGallery(sourceTab, payload) {
  const imported = await importListing(payload, false);
  const appTabId = imported.app_tab_id;
  const candidateId = imported.candidate_id;

  if (!candidateId) throw new Error("Snake Sorter did not return a candidate id.");

  await chrome.tabs.update(sourceTab.id, { active: true });

  const seen = new Set();
  let captured = 0;
  let duplicates = 0;
  let blocked = false;

  try {
    for (let ordinal = 0; ordinal < 12; ordinal++) {
      const state = await chrome.tabs.sendMessage(sourceTab.id, { type: "PREPARE_CAPTURE" });

      if (!state?.ok) {
        blocked = state?.blocked === true;
        if (!blocked && captured === 0) {
          throw new Error(state?.error || "Could not prepare gallery capture.");
        }
        break;
      }

      if (seen.has(state.fingerprint)) {
        await chrome.tabs.sendMessage(sourceTab.id, { type: "REMOVE_CAPTURE_OVERLAY" }).catch(() => undefined);
        break;
      }
      seen.add(state.fingerprint);

      const capture = await cropVisibleTab(sourceTab, state);
      await chrome.tabs.sendMessage(sourceTab.id, { type: "REMOVE_CAPTURE_OVERLAY" }).catch(() => undefined);

      const upload = await appJson(
        appTabId,
        "/api/snake-sorter/acquisition/browser-capture",
        {
          candidate_id: candidateId,
          source_url: payload.source_url,
          ordinal,
          ...capture,
        },
      );

      if (!upload?.ok) {
        throw new Error(upload?.error || "Snake Sorter rejected a rendered gallery capture.");
      }

      if (upload.duplicate) duplicates += 1;
      else captured += 1;

      if (!state.has_next) break;

      const next = await chrome.tabs.sendMessage(sourceTab.id, { type: "CLICK_GALLERY_NEXT" });
      if (!next?.ok) break;

      await new Promise((resolve) => setTimeout(resolve, 900));
    }
  } finally {
    await chrome.tabs.sendMessage(sourceTab.id, { type: "REMOVE_CAPTURE_OVERLAY" }).catch(() => undefined);
  }

  await chrome.tabs.update(appTabId, { active: true });

  return {
    ok: true,
    candidate_id: candidateId,
    title: imported.title,
    candidate_created: imported.candidate_created,
    live_references: imported.attached ?? 0,
    captured,
    duplicates,
    blocked,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!["IMPORT_LISTING_TO_SNAKE_SORTER", "CAPTURE_GALLERY_TO_SNAKE_SORTER"].includes(message?.type)) {
    return;
  }

  (async () => {
    if (message.type === "IMPORT_LISTING_TO_SNAKE_SORTER") {
      return importListing(message.payload, true);
    }

    const sourceTab = await chrome.tabs.get(message.source_tab_id);
    if (!sourceTab?.id) throw new Error("MorphMarket source tab is unavailable.");
    return captureGallery(sourceTab, message.payload);
  })()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Browser helper failed.",
    }));

  return true;
});
