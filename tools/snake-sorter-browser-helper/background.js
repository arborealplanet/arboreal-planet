const APP_URL = "https://arboreal-planet.vercel.app/snake-sorter?browser_helper_import=1";

function waitForTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "IMPORT_LISTING_TO_SNAKE_SORTER") return;

  (async () => {
    const payload = message.payload;
    if (!payload?.source_url || !Array.isArray(payload?.image_urls)) {
      throw new Error("Browser helper payload is incomplete.");
    }

    const existingTabs = await chrome.tabs.query({ url: "https://arboreal-planet.vercel.app/snake-sorter*" });
    let tab = existingTabs[0];

    if (tab?.id) {
      await chrome.tabs.update(tab.id, { active: true, url: APP_URL });
    } else {
      tab = await chrome.tabs.create({ url: APP_URL, active: true });
    }

    if (!tab?.id) throw new Error("Could not open Snake Sorter.");

    await waitForTabComplete(tab.id);

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      args: [payload],
      func: async (data) => {
        try {
          const response = await fetch("/api/snake-sorter/acquisition/browser-import", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          const body = await response.json().catch(() => ({}));
          return {
            ok: response.ok,
            status: response.status,
            ...body,
          };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : "Browser import failed.",
          };
        }
      },
    });

    if (!result?.ok) {
      throw new Error(result?.error || "Snake Sorter rejected the browser import.");
    }

    return result;
  })()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Browser helper failed.",
    }));

  return true;
});
