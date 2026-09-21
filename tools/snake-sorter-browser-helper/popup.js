const statusEl = document.getElementById("status");
const sendButton = document.getElementById("send");
const captureButton = document.getElementById("capture");

function show(message) {
  statusEl.textContent = message;
}

function setBusy(value) {
  sendButton.disabled = value;
  captureButton.disabled = value;
}

async function currentListing() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https:\/\/(?:www\.)?morphmarket\.com\//i.test(tab.url || "")) {
    throw new Error("Open a MorphMarket listing first.");
  }

  let payload;
  try {
    payload = await chrome.tabs.sendMessage(tab.id, { type: "READ_LISTING" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    payload = await chrome.tabs.sendMessage(tab.id, { type: "READ_LISTING" });
  }

  if (!payload?.ok) {
    throw new Error(payload?.error || "Could not read this listing.");
  }

  return { tab, payload };
}

sendButton.addEventListener("click", async () => {
  setBusy(true);
  show("Reading current listing…");

  try {
    const { payload } = await currentListing();
    show("Found " + payload.image_urls.length + " exposed image reference(s). Sending to Snake Sorter…");

    const data = await chrome.runtime.sendMessage({
      type: "IMPORT_LISTING_TO_SNAKE_SORTER",
      payload,
    });

    if (!data?.ok) throw new Error(data?.error || "Snake Sorter rejected the import.");

    show(
      (data.candidate_created ? "Created a new Snake Sorter candidate.\n" : "") +
      "Attached " + (data.attached ?? 0) + " live reference(s) to " + (data.title || "the listing") + ".\n\n" +
      "Snake Sorter is open so you can review them."
    );
  } catch (error) {
    show(error instanceof Error ? error.message : "Import failed.");
  } finally {
    setBusy(false);
  }
});

captureButton.addEventListener("click", async () => {
  setBusy(true);
  show("Preparing the open listing gallery. This may take a few seconds…");

  try {
    const { tab, payload } = await currentListing();

    const data = await chrome.runtime.sendMessage({
      type: "CAPTURE_GALLERY_TO_SNAKE_SORTER",
      source_tab_id: tab.id,
      payload,
    });

    if (!data?.ok) throw new Error(data?.error || "Gallery fallback failed.");

    show(
      (data.candidate_created ? "Created a new Snake Sorter candidate.\n" : "") +
      "Live refs: " + (data.live_references ?? 0) + "\n" +
      "Rendered gallery captures: " + (data.captured ?? 0) + "\n" +
      (data.duplicates ? "Duplicates skipped: " + data.duplicates + "\n" : "") +
      (data.blocked ? "Stopped because an access-control page appeared.\n" : "") +
      "\nSnake Sorter is open so you can review the results."
    );
  } catch (error) {
    show(error instanceof Error ? error.message : "Gallery fallback failed.");
  } finally {
    setBusy(false);
  }
});
